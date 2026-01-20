/**
 * SSH Tunnel Service for Oracle Database Access
 *
 * Creates an SSH tunnel to the SIBAC server for accessing the Oracle database
 * when port 1521 is firewalled and only accessible locally on the server.
 *
 * The tunnel forwards local port connections through SSH to the Oracle port
 * on the remote server, enabling database access from VPN clients.
 *
 * NOTE: ssh2 is loaded dynamically to avoid bundling issues with native modules.
 */

import type { Server, Socket } from "node:net";
import { createServer } from "node:net";
import type { Client as SshClient } from "ssh2";

// Dynamic import for ssh2 to avoid bundling native module issues
let ssh2Module: typeof import("ssh2") | null = null;

async function getSsh2(): Promise<typeof import("ssh2")> {
  if (!ssh2Module) {
    ssh2Module = await import("ssh2");
  }
  return ssh2Module;
}

// ============================================================================
// TYPES
// ============================================================================

export type SshTunnelConfig = {
  /** SSH server hostname (default: ORACLE_HOST or 192.168.0.204) */
  sshHost: string;
  /** SSH server port (default: 22) */
  sshPort: number;
  /** SSH username */
  username: string;
  /** SSH password (if using password auth) */
  password?: string;
  /** Path to private key file (if using key auth) */
  privateKeyPath?: string;
  /** Private key content (if using key auth) */
  privateKey?: string;
  /** Local port to bind (default: 11521 to avoid conflicts) */
  localPort: number;
  /** Remote host to forward to (from SSH server perspective) */
  remoteHost: string;
  /** Remote port to forward to (Oracle default: 1521) */
  remotePort: number;
};

export type SshTunnelStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type SshTunnelResult = {
  success: boolean;
  status: SshTunnelStatus;
  message: string;
  localPort?: number;
};

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Default local port for SSH tunnel (use non-privileged port) */
const DEFAULT_LOCAL_PORT = 11_521;

/** Connection timeout in milliseconds */
const SSH_CONNECT_TIMEOUT = 30_000;

/** Keep-alive interval in milliseconds */
const SSH_KEEPALIVE_INTERVAL = 10_000;

/**
 * Get SSH tunnel configuration from environment variables
 */
export function getSshTunnelConfig(): SshTunnelConfig {
  const oracleHost = process.env.ORACLE_HOST ?? "192.168.0.204";

  return {
    sshHost: process.env.SSH_HOST ?? oracleHost,
    sshPort: Number.parseInt(process.env.SSH_PORT ?? "22", 10),
    username: process.env.SSH_USERNAME ?? process.env.VPN_USERNAME ?? "",
    password: process.env.SSH_PASSWORD ?? process.env.VPN_PASSWORD,
    privateKeyPath: process.env.SSH_PRIVATE_KEY,
    privateKey: process.env.SSH_PRIVATE_KEY_CONTENT,
    localPort: Number.parseInt(
      process.env.SSH_LOCAL_PORT ?? String(DEFAULT_LOCAL_PORT),
      10
    ),
    remoteHost: "localhost", // Oracle is on the same server as SSH
    remotePort: Number.parseInt(process.env.ORACLE_PORT ?? "1521", 10),
  };
}

/**
 * Check if SSH tunnel is enabled via environment
 */
export function isSshTunnelEnabled(): boolean {
  return process.env.SSH_TUNNEL_ENABLED === "true";
}

/**
 * Validate SSH configuration
 */
function validateSshConfig(config: SshTunnelConfig): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!config.username) {
    missing.push("SSH_USERNAME or VPN_USERNAME");
  }

  if (!config.password && !config.privateKey && !config.privateKeyPath) {
    missing.push("SSH_PASSWORD, SSH_PRIVATE_KEY, or SSH_PRIVATE_KEY_CONTENT");
  }

  return { valid: missing.length === 0, missing };
}

// ============================================================================
// TUNNEL STATE
// ============================================================================

/** Active SSH client connection */
let sshClient: SshClient | null = null;

/** Local TCP server for tunnel */
let localServer: Server | null = null;

/** Current tunnel status */
let tunnelStatus: SshTunnelStatus = "disconnected";

/** Active forwarded connections */
const activeConnections: Set<Socket> = new Set();

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get current tunnel status
 */
export function getTunnelStatus(): SshTunnelStatus {
  return tunnelStatus;
}

/**
 * Check if tunnel is connected and ready
 */
export function isTunnelConnected(): boolean {
  return tunnelStatus === "connected" && sshClient !== null;
}

/**
 * Get the local port to use for Oracle connections when tunnel is active
 */
export function getTunnelLocalPort(): number {
  const config = getSshTunnelConfig();
  return config.localPort;
}

/**
 * Get the effective Oracle connection host (localhost when tunnel is active)
 */
export function getEffectiveOracleHost(): string {
  if (isSshTunnelEnabled() && isTunnelConnected()) {
    return "localhost";
  }
  return process.env.ORACLE_HOST ?? "192.168.0.204";
}

/**
 * Get the effective Oracle connection port
 */
export function getEffectiveOraclePort(): number {
  if (isSshTunnelEnabled() && isTunnelConnected()) {
    return getTunnelLocalPort();
  }
  return Number.parseInt(process.env.ORACLE_PORT ?? "1521", 10);
}

/**
 * Establish SSH tunnel connection
 */
export async function connectSshTunnel(): Promise<SshTunnelResult> {
  // Check if already connected
  if (tunnelStatus === "connected" && sshClient) {
    return {
      success: true,
      status: "connected",
      message: "SSH tunnel già connesso",
      localPort: getTunnelLocalPort(),
    };
  }

  // Check if tunnel is enabled
  if (!isSshTunnelEnabled()) {
    return {
      success: false,
      status: "disconnected",
      message:
        "SSH tunnel non abilitato. Impostare SSH_TUNNEL_ENABLED=true per attivarlo.",
    };
  }

  const config = getSshTunnelConfig();

  // Validate configuration
  const { valid, missing } = validateSshConfig(config);
  if (!valid) {
    return {
      success: false,
      status: "error",
      message: `Configurazione SSH incompleta. Variabili mancanti: ${missing.join(", ")}`,
    };
  }

  tunnelStatus = "connecting";
  console.log(
    `[SSH Tunnel] Connessione a ${config.sshHost}:${config.sshPort}...`
  );

  // Dynamically import ssh2 to avoid bundling issues
  const { Client } = await getSsh2();

  return new Promise((resolve) => {
    const client = new Client();
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        tunnelStatus = "error";
        client.end();
      }
    };

    // Set connection timeout
    const timeout = setTimeout(() => {
      cleanup();
      resolve({
        success: false,
        status: "error",
        message: "Timeout connessione SSH",
      });
    }, SSH_CONNECT_TIMEOUT);

    client.on("ready", async () => {
      clearTimeout(timeout);
      console.log("[SSH Tunnel] Connessione SSH stabilita");

      // Create local TCP server for port forwarding
      try {
        await startLocalServer(client, config);
        sshClient = client;
        tunnelStatus = "connected";
        resolved = true;

        resolve({
          success: true,
          status: "connected",
          message: `SSH tunnel attivo su localhost:${config.localPort}`,
          localPort: config.localPort,
        });
      } catch (error) {
        cleanup();
        resolve({
          success: false,
          status: "error",
          message: `Errore creazione tunnel: ${error}`,
        });
      }
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      console.error("[SSH Tunnel] Errore SSH:", err.message);
      cleanup();
      resolve({
        success: false,
        status: "error",
        message: `Errore SSH: ${err.message}`,
      });
    });

    client.on("close", () => {
      if (tunnelStatus === "connected") {
        console.log("[SSH Tunnel] Connessione chiusa");
        tunnelStatus = "disconnected";
        sshClient = null;
        stopLocalServer();
      }
    });

    // Build connection options
    const connectOptions: Parameters<typeof client.connect>[0] = {
      host: config.sshHost,
      port: config.sshPort,
      username: config.username,
      readyTimeout: SSH_CONNECT_TIMEOUT,
      keepaliveInterval: SSH_KEEPALIVE_INTERVAL,
    };

    // Add authentication method
    if (config.privateKey) {
      connectOptions.privateKey = config.privateKey;
    } else if (config.privateKeyPath) {
      const keyPath = config.privateKeyPath;
      // biome-ignore lint/style/useNodejsImportProtocol: dynamic import
      import("fs").then(({ readFileSync }) => {
        connectOptions.privateKey = readFileSync(keyPath);
        client.connect(connectOptions);
      });
      return;
    } else if (config.password) {
      connectOptions.password = config.password;
    }

    client.connect(connectOptions);
  });
}

/**
 * Disconnect SSH tunnel
 */
export function disconnectSshTunnel(): SshTunnelResult {
  if (tunnelStatus === "disconnected" || !sshClient) {
    return {
      success: true,
      status: "disconnected",
      message: "SSH tunnel già disconnesso",
    };
  }

  console.log("[SSH Tunnel] Disconnessione...");

  // Close all active connections
  for (const conn of Array.from(activeConnections)) {
    conn.destroy();
  }
  activeConnections.clear();

  // Stop local server
  stopLocalServer();

  // Close SSH client
  sshClient.end();
  sshClient = null;
  tunnelStatus = "disconnected";

  return {
    success: true,
    status: "disconnected",
    message: "SSH tunnel disconnesso",
  };
}

/**
 * Test SSH connectivity without establishing full tunnel
 */
export async function testSshConnection(): Promise<SshTunnelResult> {
  if (!isSshTunnelEnabled()) {
    return {
      success: false,
      status: "disconnected",
      message: "SSH tunnel non abilitato",
    };
  }

  const config = getSshTunnelConfig();
  const { valid, missing } = validateSshConfig(config);

  if (!valid) {
    return {
      success: false,
      status: "error",
      message: `Configurazione SSH incompleta: ${missing.join(", ")}`,
    };
  }

  // Dynamically import ssh2 to avoid bundling issues
  const { Client } = await getSsh2();

  return new Promise((resolve) => {
    const client = new Client();
    const timeout = setTimeout(() => {
      client.end();
      resolve({
        success: false,
        status: "error",
        message: "Timeout test connessione SSH",
      });
    }, 10_000);

    client.on("ready", () => {
      clearTimeout(timeout);
      client.end();
      resolve({
        success: true,
        status: "connected",
        message: "Connessione SSH disponibile",
      });
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        status: "error",
        message: `Test SSH fallito: ${err.message}`,
      });
    });

    const connectOptions: Parameters<typeof client.connect>[0] = {
      host: config.sshHost,
      port: config.sshPort,
      username: config.username,
      readyTimeout: 10_000,
    };

    if (config.privateKey) {
      connectOptions.privateKey = config.privateKey;
    } else if (config.password) {
      connectOptions.password = config.password;
    }

    client.connect(connectOptions);
  });
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Start local TCP server for port forwarding
 */
function startLocalServer(client: SshClient, config: SshTunnelConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer((localSocket) => {
      activeConnections.add(localSocket);

      // Request port forward through SSH
      client.forwardOut(
        "127.0.0.1",
        config.localPort,
        config.remoteHost,
        config.remotePort,
        (err, stream) => {
          if (err) {
            console.error("[SSH Tunnel] Errore forward:", err.message);
            localSocket.end();
            activeConnections.delete(localSocket);
            return;
          }

          // Pipe data between local socket and SSH stream
          localSocket.pipe(stream);
          stream.pipe(localSocket);

          stream.on("close", () => {
            localSocket.end();
            activeConnections.delete(localSocket);
          });

          localSocket.on("close", () => {
            stream.end();
            activeConnections.delete(localSocket);
          });

          stream.on("error", (streamErr) => {
            console.error("[SSH Tunnel] Stream error:", streamErr.message);
            localSocket.end();
            activeConnections.delete(localSocket);
          });

          localSocket.on("error", (sockErr) => {
            console.error("[SSH Tunnel] Socket error:", sockErr.message);
            stream.end();
            activeConnections.delete(localSocket);
          });
        }
      );
    });

    server.on("error", (err) => {
      console.error("[SSH Tunnel] Server error:", err.message);
      reject(err);
    });

    server.listen(config.localPort, "127.0.0.1", () => {
      console.log(
        `[SSH Tunnel] Server locale in ascolto su 127.0.0.1:${config.localPort}`
      );
      localServer = server;
      resolve();
    });
  });
}

/**
 * Stop local TCP server
 */
function stopLocalServer(): void {
  if (localServer) {
    localServer.close();
    localServer = null;
  }
}

/**
 * Wrapper to ensure SSH tunnel is connected before executing a callback
 */
export async function withSshTunnel<T>(callback: () => Promise<T>): Promise<T> {
  if (!isSshTunnelEnabled()) {
    // Tunnel not enabled, run callback directly
    return callback();
  }

  // Ensure tunnel is connected
  const result = await connectSshTunnel();
  if (!result.success) {
    throw new Error(result.message);
  }

  return callback();
}

/**
 * Get SSH tunnel info (for diagnostics, without sensitive data)
 */
export function getSshTunnelInfo(): {
  enabled: boolean;
  status: SshTunnelStatus;
  sshHost: string;
  sshPort: number;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  configured: boolean;
} {
  const config = getSshTunnelConfig();
  const { valid } = validateSshConfig(config);

  return {
    enabled: isSshTunnelEnabled(),
    status: tunnelStatus,
    sshHost: config.sshHost,
    sshPort: config.sshPort,
    localPort: config.localPort,
    remoteHost: config.remoteHost,
    remotePort: config.remotePort,
    configured: valid,
  };
}

/**
 * Faenza VPN Connection Service
 *
 * Manages automatic VPN connection for accessing the SIBAC Oracle database.
 * Supports both macOS (native VPN) and Linux (vpnc for Cisco IPSec).
 */

import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/** Detect the current platform */
const PLATFORM = process.platform; // 'darwin' for macOS, 'linux' for Linux

/** VPN Configuration from environment variables */
const VPN_CONFIG = {
  serviceName: process.env.VPN_NAME ?? "faenza vpn",
  serverAddress: process.env.VPN_SERVER ?? "195.62.179.98",
  username: process.env.VPN_USERNAME ?? "",
  password: process.env.VPN_PASSWORD ?? "",
  sharedSecret: process.env.VPN_SHARED_SECRET ?? "",
  groupName: process.env.VPN_GROUP_NAME ?? "Memoraiz",
};

/** Timeout for VPN connection attempts (ms) */
const VPN_CONNECT_TIMEOUT = 30_000;

/** Polling interval when waiting for connection (ms) */
const VPN_POLL_INTERVAL = 1000;

/** Maximum number of connection retries */
const MAX_RETRIES = 3;

/** Path for vpnc pid file on Linux */
const VPNC_PID_FILE = "/var/run/vpnc.pid";

/**
 * VPN connection status
 */
export type VpnStatus = "connected" | "disconnected" | "connecting" | "error";

/**
 * VPN connection result
 */
export type VpnConnectionResult = {
  success: boolean;
  status: VpnStatus;
  message: string;
};

/**
 * Validate VPN configuration
 */
function validateConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!VPN_CONFIG.username) {
    missing.push("VPN_USERNAME");
  }
  if (!VPN_CONFIG.password) {
    missing.push("VPN_PASSWORD");
  }
  if (!VPN_CONFIG.sharedSecret) {
    missing.push("VPN_SHARED_SECRET");
  }

  return { valid: missing.length === 0, missing };
}

// ============================================================================
// macOS Implementation (using scutil/networksetup)
// ============================================================================

/**
 * Check if VPN is connected on macOS
 */
async function isVpnConnectedMacOS(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `scutil --nc status "${VPN_CONFIG.serviceName}"`
    );
    return stdout.includes("Connected");
  } catch {
    return false;
  }
}

/**
 * Get VPN status on macOS
 */
async function getVpnStatusMacOS(): Promise<VpnStatus> {
  try {
    const { stdout } = await execAsync(
      `scutil --nc status "${VPN_CONFIG.serviceName}"`
    );

    if (stdout.includes("Connected")) {
      return "connected";
    }
    if (stdout.includes("Connecting")) {
      return "connecting";
    }
    return "disconnected";
  } catch {
    return "error";
  }
}

/**
 * Connect to VPN on macOS
 */
async function connectVpnMacOS(): Promise<VpnConnectionResult> {
  try {
    // Check if VPN profile exists
    const { stdout: profiles } = await execAsync("scutil --nc list");
    if (!profiles.includes(VPN_CONFIG.serviceName)) {
      return {
        success: false,
        status: "error",
        message: `Profilo VPN "${VPN_CONFIG.serviceName}" non trovato. Eseguire prima lo script di setup: scripts/setup-vpn-macos.sh`,
      };
    }

    // Start VPN connection
    await execAsync(`scutil --nc start "${VPN_CONFIG.serviceName}"`);
    return {
      success: true,
      status: "connecting",
      message: "Connessione VPN avviata",
    };
  } catch (error) {
    return {
      success: false,
      status: "error",
      message: `Errore connessione macOS: ${error}`,
    };
  }
}

/**
 * Disconnect VPN on macOS
 */
async function disconnectVpnMacOS(): Promise<VpnConnectionResult> {
  try {
    await execAsync(`scutil --nc stop "${VPN_CONFIG.serviceName}"`);
    return {
      success: true,
      status: "disconnected",
      message: "VPN disconnesso",
    };
  } catch (error) {
    return {
      success: false,
      status: "error",
      message: `Errore disconnessione macOS: ${error}`,
    };
  }
}

// ============================================================================
// Linux Implementation (using vpnc for Cisco IPSec)
// ============================================================================

/**
 * Create vpnc configuration file
 */
async function createVpncConfig(): Promise<string> {
  const configContent = `# Faenza VPN Configuration (auto-generated)
IPSec gateway ${VPN_CONFIG.serverAddress}
IPSec ID ${VPN_CONFIG.groupName}
IPSec secret ${VPN_CONFIG.sharedSecret}
Xauth username ${VPN_CONFIG.username}
Xauth password ${VPN_CONFIG.password}
`;

  const configDir = join(tmpdir(), "faenza-vpn");
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true, mode: 0o700 });
  }

  const configPath = join(configDir, "vpnc.conf");
  await writeFile(configPath, configContent, { mode: 0o600 });

  return configPath;
}

/**
 * Check if VPN is connected on Linux
 */
async function isVpnConnectedLinux(): Promise<boolean> {
  try {
    // Check if vpnc process is running
    if (existsSync(VPNC_PID_FILE)) {
      const { stdout: pidOutput } = await execAsync(`cat ${VPNC_PID_FILE}`);
      const pid = pidOutput.trim();
      if (pid) {
        try {
          await execAsync(`kill -0 ${pid}`);
          return true;
        } catch {
          // Process not running
        }
      }
    }

    // Alternative: check for tun interface
    const { stdout: ifOutput } = await execAsync(
      "ip link show 2>/dev/null || ifconfig"
    );
    return ifOutput.includes("tun0");
  } catch {
    return false;
  }
}

/**
 * Get VPN status on Linux
 */
async function getVpnStatusLinux(): Promise<VpnStatus> {
  const connected = await isVpnConnectedLinux();
  return connected ? "connected" : "disconnected";
}

/**
 * Connect to VPN on Linux using vpnc
 */
async function connectVpnLinux(): Promise<VpnConnectionResult> {
  try {
    // Check if vpnc is installed
    try {
      await execAsync("which vpnc");
    } catch {
      return {
        success: false,
        status: "error",
        message:
          "vpnc non installato. Installare con: sudo apt-get install vpnc",
      };
    }

    // Create config file
    const configPath = await createVpncConfig();

    // Connect using vpnc (requires sudo)
    await execAsync(`sudo vpnc ${configPath}`);

    // Clean up config file (contains sensitive data)
    await unlink(configPath).catch(() => {
      /* ignore */
    });

    return {
      success: true,
      status: "connecting",
      message: "Connessione VPN avviata con vpnc",
    };
  } catch (error) {
    return {
      success: false,
      status: "error",
      message: `Errore connessione Linux: ${error}`,
    };
  }
}

/**
 * Disconnect VPN on Linux
 */
async function disconnectVpnLinux(): Promise<VpnConnectionResult> {
  try {
    await execAsync("sudo vpnc-disconnect");
    return {
      success: true,
      status: "disconnected",
      message: "VPN disconnesso",
    };
  } catch (error) {
    return {
      success: false,
      status: "error",
      message: `Errore disconnessione Linux: ${error}`,
    };
  }
}

// ============================================================================
// Cross-Platform Public API
// ============================================================================

/**
 * Check if the VPN is currently connected
 */
export async function isVpnConnected(): Promise<boolean> {
  if (PLATFORM === "darwin") {
    return await isVpnConnectedMacOS();
  }
  return await isVpnConnectedLinux();
}

/**
 * Get the current VPN status
 */
export async function getVpnStatus(): Promise<VpnStatus> {
  if (PLATFORM === "darwin") {
    return await getVpnStatusMacOS();
  }
  return await getVpnStatusLinux();
}

/**
 * Wait for VPN to reach connected status
 */
async function waitForConnection(timeoutMs: number): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = await getVpnStatus();

    if (status === "connected") {
      return true;
    }

    if (status === "error" || status === "disconnected") {
      const elapsed = Date.now() - startTime;
      if (elapsed > 5000) {
        return false;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, VPN_POLL_INTERVAL));
  }

  return false;
}

/**
 * Connect to the Faenza VPN
 */
export async function connectVpn(): Promise<VpnConnectionResult> {
  // Validate configuration
  const { valid, missing } = validateConfig();
  if (!valid) {
    return {
      success: false,
      status: "error",
      message: `Configurazione VPN incompleta. Variabili mancanti: ${missing.join(", ")}`,
    };
  }

  // Check if already connected
  const currentStatus = await getVpnStatus();

  if (currentStatus === "connected") {
    return {
      success: true,
      status: "connected",
      message: "VPN già connesso",
    };
  }

  // Try to connect with retries
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[VPN] Tentativo di connessione ${attempt}/${MAX_RETRIES}...`);

    const connectResult =
      PLATFORM === "darwin" ? await connectVpnMacOS() : await connectVpnLinux();

    if (!connectResult.success) {
      console.log(
        `[VPN] Tentativo ${attempt} fallito: ${connectResult.message}`
      );
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      continue;
    }

    // Wait for connection to establish
    const connected = await waitForConnection(VPN_CONNECT_TIMEOUT);

    if (connected) {
      console.log("[VPN] Connessione stabilita con successo");
      return {
        success: true,
        status: "connected",
        message: "VPN connesso con successo",
      };
    }

    console.log(`[VPN] Tentativo ${attempt} fallito, timeout raggiunto`);

    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return {
    success: false,
    status: "error",
    message: `Impossibile connettersi al VPN dopo ${MAX_RETRIES} tentativi`,
  };
}

/**
 * Disconnect from the Faenza VPN
 */
export async function disconnectVpn(): Promise<VpnConnectionResult> {
  const status = await getVpnStatus();

  if (status === "disconnected") {
    return {
      success: true,
      status: "disconnected",
      message: "VPN già disconnesso",
    };
  }

  const result =
    PLATFORM === "darwin"
      ? await disconnectVpnMacOS()
      : await disconnectVpnLinux();

  // Wait a moment for disconnection
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const newStatus = await getVpnStatus();

  return {
    success: newStatus === "disconnected",
    status: newStatus,
    message:
      newStatus === "disconnected"
        ? "VPN disconnesso con successo"
        : result.message,
  };
}

/**
 * Ensure VPN is connected before executing a callback
 */
export async function withVpnConnection<T>(
  callback: () => Promise<T>
): Promise<T> {
  const autoConnect = process.env.VPN_AUTO_CONNECT !== "false";

  if (!autoConnect) {
    const connected = await isVpnConnected();
    if (!connected) {
      throw new Error(
        "VPN non connesso. Connettere manualmente al VPN prima di utilizzare questa funzione."
      );
    }
    return callback();
  }

  const connectionResult = await connectVpn();

  if (!connectionResult.success) {
    throw new Error(connectionResult.message);
  }

  return callback();
}

/**
 * Check if the remote Oracle server is reachable via ping
 */
export async function isOracleServerReachable(): Promise<boolean> {
  const host = process.env.ORACLE_HOST ?? "192.168.0.204";

  try {
    const pingCmd =
      PLATFORM === "darwin"
        ? `ping -c 1 -W 2 ${host}`
        : `ping -c 1 -W 2 ${host}`;
    await execAsync(pingCmd);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if the Oracle port (1521) is reachable
 * This uses nc (netcat) for a TCP connection test
 */
export async function isOraclePortReachable(): Promise<boolean> {
  const host = process.env.ORACLE_HOST ?? "192.168.0.204";
  const port = process.env.ORACLE_PORT ?? "1521";

  try {
    // Use nc (netcat) to test TCP connection with 3 second timeout
    const ncCmd =
      PLATFORM === "darwin"
        ? `nc -z -w 3 ${host} ${port}`
        : `nc -z -w 3 ${host} ${port}`;
    await execAsync(ncCmd);
    return true;
  } catch {
    return false;
  }
}

/**
 * Oracle connection diagnostic result
 */
export type OracleDiagnosticResult = {
  vpnConnected: boolean;
  serverReachable: boolean;
  portReachable: boolean;
  sshTunnelEnabled: boolean;
  sshTunnelConnected: boolean;
  status:
    | "ok"
    | "vpn_disconnected"
    | "server_unreachable"
    | "port_blocked"
    | "ssh_tunnel_available"
    | "ssh_tunnel_error";
  message: string;
};

/**
 * Run full Oracle connectivity diagnostics
 * Returns detailed status about VPN, server, port, and SSH tunnel accessibility
 */
export async function diagnoseOracleConnection(): Promise<OracleDiagnosticResult> {
  // Import SSH tunnel functions dynamically to avoid circular dependencies
  const {
    isSshTunnelEnabled,
    isTunnelConnected,
    connectSshTunnel,
    testSshConnection,
  } = await import("./ssh-tunnel");

  const host = process.env.ORACLE_HOST ?? "192.168.0.204";
  const port = process.env.ORACLE_PORT ?? "1521";
  const sshTunnelEnabled = isSshTunnelEnabled();
  const sshTunnelConnected = isTunnelConnected();

  // Check VPN connection
  const vpnConnected = await isVpnConnected();
  if (!vpnConnected) {
    return {
      vpnConnected: false,
      serverReachable: false,
      portReachable: false,
      sshTunnelEnabled,
      sshTunnelConnected: false,
      status: "vpn_disconnected",
      message: "VPN non connesso. Connettere al VPN per accedere al database.",
    };
  }

  // Check server reachability via ping
  const serverReachable = await isOracleServerReachable();
  if (!serverReachable) {
    return {
      vpnConnected: true,
      serverReachable: false,
      portReachable: false,
      sshTunnelEnabled,
      sshTunnelConnected: false,
      status: "server_unreachable",
      message: `Server ${host} non raggiungibile. Verificare la configurazione VPN.`,
    };
  }

  // Check Oracle port accessibility (direct connection)
  const portReachable = await isOraclePortReachable();

  // If port is not reachable directly, check SSH tunnel options
  if (!portReachable) {
    // If SSH tunnel is enabled, try to connect
    if (sshTunnelEnabled) {
      if (sshTunnelConnected) {
        // Tunnel is connected, should be OK
        return {
          vpnConnected: true,
          serverReachable: true,
          portReachable: false,
          sshTunnelEnabled: true,
          sshTunnelConnected: true,
          status: "ok",
          message:
            "Connessione Oracle disponibile tramite tunnel SSH (porta diretta bloccata).",
        };
      }

      // Try to establish tunnel
      const tunnelResult = await connectSshTunnel();
      if (tunnelResult.success) {
        return {
          vpnConnected: true,
          serverReachable: true,
          portReachable: false,
          sshTunnelEnabled: true,
          sshTunnelConnected: true,
          status: "ok",
          message: `Connessione Oracle disponibile tramite tunnel SSH su localhost:${tunnelResult.localPort}.`,
        };
      }

      // Tunnel failed
      return {
        vpnConnected: true,
        serverReachable: true,
        portReachable: false,
        sshTunnelEnabled: true,
        sshTunnelConnected: false,
        status: "ssh_tunnel_error",
        message: `Porta Oracle ${port} bloccata. Tunnel SSH abilitato ma fallito: ${tunnelResult.message}`,
      };
    }

    // Port blocked and no SSH tunnel enabled - test if SSH could work
    const sshTest = await testSshConnection();
    if (sshTest.success) {
      return {
        vpnConnected: true,
        serverReachable: true,
        portReachable: false,
        sshTunnelEnabled: false,
        sshTunnelConnected: false,
        status: "ssh_tunnel_available",
        message: `Porta Oracle ${port} bloccata su ${host}. SSH disponibile - impostare SSH_TUNNEL_ENABLED=true per abilitare il tunnel.`,
      };
    }

    // Port blocked, no tunnel available
    return {
      vpnConnected: true,
      serverReachable: true,
      portReachable: false,
      sshTunnelEnabled: false,
      sshTunnelConnected: false,
      status: "port_blocked",
      message: `Porta Oracle ${port} non raggiungibile su ${host}. Il servizio Oracle potrebbe essere spento o bloccato dal firewall.`,
    };
  }

  return {
    vpnConnected: true,
    serverReachable: true,
    portReachable: true,
    sshTunnelEnabled,
    sshTunnelConnected,
    status: "ok",
    message: "Connessione Oracle disponibile.",
  };
}

/**
 * Get VPN configuration info (without sensitive data)
 */
export function getVpnInfo(): {
  platform: string;
  serviceName: string;
  serverAddress: string;
  groupName: string;
  configured: boolean;
} {
  const { valid } = validateConfig();
  return {
    platform: PLATFORM,
    serviceName: VPN_CONFIG.serviceName,
    serverAddress: VPN_CONFIG.serverAddress,
    groupName: VPN_CONFIG.groupName,
    configured: valid,
  };
}

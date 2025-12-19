/**
 * SIBAC SMB Share Client
 *
 * Provides automatic file synchronization from the Windows shared folder
 * "SIBAC 01 - Cartella Condivisa" at 192.168.0.204.
 *
 * Supports both macOS (mount_smbfs) and Linux (mount.cifs).
 */

import { exec } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { isVpnConnected } from "../vpn/faenza-vpn";

const execAsync = promisify(exec);

/** Detect the current platform */
const PLATFORM = process.platform;

/** SMB Configuration from environment variables */
const SMB_CONFIG = {
  host: process.env.SMB_HOST ?? "sibac01",
  shareName: process.env.SMB_SHARE_NAME ?? "Akropolis - FE",
  // Optional subdirectory within the share (e.g., "Faenza")
  subDirectory: process.env.SMB_SUB_DIRECTORY ?? "Faenza",
  username: process.env.SMB_USERNAME ?? process.env.VPN_USERNAME ?? "",
  password: process.env.SMB_PASSWORD ?? process.env.VPN_PASSWORD ?? "",
  domain: process.env.SMB_DOMAIN ?? "WORKGROUP",
};

/** Local directory to sync files to */
const LOCAL_SIBAC_PATH = join(
  process.cwd(),
  "mastra/knowledgebase/sibac-shared"
);

/** Temporary mount point for SMB share */
const MOUNT_POINT = "/tmp/sibac-share-mount";

/** File extensions to sync */
const SYNC_EXTENSIONS = [".xml", ".pdf", ".doc", ".docx"];

/** Timeout for SMB operations (ms) */
const SMB_TIMEOUT = 30_000;

/** Whitespace split pattern */
const WHITESPACE_SPLIT_REGEX = /\s+/;

/**
 * SMB sync result type
 */
export type SmbSyncResult = {
  success: boolean;
  message: string;
  filesFound: number;
  filesSynced: number;
  errors: string[];
};

/**
 * SMB directory entry (file or folder)
 */
export type SmbEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
};

/**
 * SMB folder with contents
 */
export type SmbFolder = {
  name: string;
  path: string;
  entries: SmbEntry[];
  subfolders: SmbFolder[];
  files: SmbEntry[];
};

/**
 * Validate SMB configuration
 */
function validateConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!SMB_CONFIG.username) {
    missing.push("SMB_USERNAME or VPN_USERNAME");
  }
  if (!SMB_CONFIG.password) {
    missing.push("SMB_PASSWORD or VPN_PASSWORD");
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Ensure local directory exists
 */
function ensureLocalDirectory(): void {
  if (!existsSync(LOCAL_SIBAC_PATH)) {
    mkdirSync(LOCAL_SIBAC_PATH, { recursive: true });
    console.log(`[SMB] Created local directory: ${LOCAL_SIBAC_PATH}`);
  }
}

/**
 * Ensure mount point exists
 */
function ensureMountPoint(): void {
  if (!existsSync(MOUNT_POINT)) {
    mkdirSync(MOUNT_POINT, { recursive: true });
  }
}

/**
 * Check if share is already mounted
 */
async function isShareMounted(): Promise<boolean> {
  try {
    const { stdout } = await execAsync("mount");
    return (
      stdout.includes(MOUNT_POINT) || stdout.includes(SMB_CONFIG.shareName)
    );
  } catch {
    return false;
  }
}

/**
 * Mount SMB share on macOS using mount_smbfs
 *
 * Note: mount_smbfs URL format is: //[domain;]user[:password]@server/share
 * Spaces in share names must be URL-encoded as %20
 */
async function mountShareMacOS(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    ensureMountPoint();

    // For macOS mount_smbfs, we need to properly encode the URL
    // Escape special characters in credentials
    const encodedPassword = encodeURIComponent(SMB_CONFIG.password);
    const encodedUsername = encodeURIComponent(SMB_CONFIG.username);

    // For share name, spaces must be %20 encoded
    const encodedShareName = encodeURIComponent(SMB_CONFIG.shareName);

    // Build mount URL: //user:pass@host/share
    const mountUrl = `//${encodedUsername}:${encodedPassword}@${SMB_CONFIG.host}/${encodedShareName}`;

    console.log(
      `[SMB] Mounting share on macOS: //${SMB_CONFIG.host}/${SMB_CONFIG.shareName}`
    );

    // Try with SMB2/3 first (more compatible with modern Windows)
    try {
      await execAsync(
        `mount_smbfs -o vers=3.0 "${mountUrl}" "${MOUNT_POINT}"`,
        { timeout: SMB_TIMEOUT }
      );
      console.log("[SMB] Share mounted successfully with SMB3");
      return { success: true };
    } catch {
      // Fall back to default SMB version
      console.log("[SMB] SMB3 failed, trying default version...");
    }

    // Try without version specification
    try {
      await execAsync(`mount_smbfs "${mountUrl}" "${MOUNT_POINT}"`, {
        timeout: SMB_TIMEOUT,
      });
      console.log("[SMB] Share mounted successfully");
      return { success: true };
    } catch (mountError) {
      // If standard mount fails, try using Finder's mount (AppleScript)
      console.log("[SMB] Standard mount failed, trying Finder mount...");

      const finderUrl = `smb://${encodedUsername}:${encodedPassword}@${SMB_CONFIG.host}/${encodedShareName}`;
      try {
        await execAsync(`osascript -e 'mount volume "${finderUrl}"'`, {
          timeout: SMB_TIMEOUT,
        });

        // Find where Finder mounted it and link to our mount point
        const { stdout: finderMount } = await execAsync(
          `mount | grep "${SMB_CONFIG.host}" | head -1 | awk '{print $3}'`
        );
        const actualMountPath = finderMount.trim();

        if (actualMountPath) {
          // Create symlink to the Finder mount
          await execAsync(`ln -sf "${actualMountPath}" "${MOUNT_POINT}"`);
          console.log(`[SMB] Mounted via Finder at: ${actualMountPath}`);
          return { success: true };
        }
      } catch {
        // Finder mount also failed
      }

      throw mountError;
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[SMB] Mount failed on macOS:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Mount SMB share on Linux using mount.cifs
 */
async function mountShareLinux(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    ensureMountPoint();

    const sharePath = `//${SMB_CONFIG.host}/${SMB_CONFIG.shareName}`;

    console.log(`[SMB] Mounting share on Linux: ${sharePath}`);

    // Use mount.cifs with credentials
    const mountCmd = `sudo mount -t cifs "${sharePath}" "${MOUNT_POINT}" -o username=${SMB_CONFIG.username},password=${SMB_CONFIG.password},domain=${SMB_CONFIG.domain},iocharset=utf8`;

    await execAsync(mountCmd, { timeout: SMB_TIMEOUT });

    console.log("[SMB] Share mounted successfully");
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[SMB] Mount failed on Linux:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Unmount SMB share
 */
async function unmountShare(): Promise<void> {
  try {
    if (await isShareMounted()) {
      if (PLATFORM === "darwin") {
        await execAsync(`umount "${MOUNT_POINT}"`);
      } else {
        await execAsync(`sudo umount "${MOUNT_POINT}"`);
      }
      console.log("[SMB] Share unmounted");
    }
  } catch (error) {
    console.warn("[SMB] Failed to unmount share:", error);
  }
}

/**
 * Mount the SMB share (cross-platform)
 */
async function mountShare(): Promise<{ success: boolean; error?: string }> {
  // Check if already mounted
  if (await isShareMounted()) {
    console.log("[SMB] Share already mounted");
    return { success: true };
  }

  if (PLATFORM === "darwin") {
    return mountShareMacOS();
  }
  return mountShareLinux();
}

/**
 * Get the source path within the mounted share
 * Uses subdirectory if configured
 */
function getSourcePath(): string {
  if (SMB_CONFIG.subDirectory) {
    return join(MOUNT_POINT, SMB_CONFIG.subDirectory);
  }
  return MOUNT_POINT;
}

/**
 * Copy files from mounted share to local directory
 */
function syncFilesFromMount(): { synced: number; errors: string[] } {
  const errors: string[] = [];
  let synced = 0;

  try {
    const sourcePath = getSourcePath();

    if (!existsSync(sourcePath)) {
      return {
        synced: 0,
        errors: [
          `Subdirectory "${SMB_CONFIG.subDirectory}" not found in share`,
        ],
      };
    }

    const files = readdirSync(sourcePath);

    for (const file of files) {
      // Check file extension
      const hasValidExtension = SYNC_EXTENSIONS.some((ext) =>
        file.toLowerCase().endsWith(ext)
      );

      if (!hasValidExtension) {
        continue;
      }

      const fileSourcePath = join(sourcePath, file);
      const destPath = join(LOCAL_SIBAC_PATH, file);

      try {
        // Check if file exists and is newer
        const sourceStats = statSync(fileSourcePath);

        if (!sourceStats.isFile()) {
          continue;
        }

        let shouldCopy = true;
        if (existsSync(destPath)) {
          const destStats = statSync(destPath);
          // Only copy if source is newer or different size
          shouldCopy =
            sourceStats.mtime > destStats.mtime ||
            sourceStats.size !== destStats.size;
        }

        if (shouldCopy) {
          copyFileSync(fileSourcePath, destPath);
          synced++;
          console.log(`[SMB] Synced: ${file}`);
        }
      } catch (fileError) {
        const msg = `Failed to sync ${file}: ${fileError}`;
        console.error(`[SMB] ${msg}`);
        errors.push(msg);
      }
    }

    return { synced, errors };
  } catch (error) {
    const msg = `Failed to read mount point: ${error}`;
    console.error(`[SMB] ${msg}`);
    return { synced: 0, errors: [msg] };
  }
}

/**
 * Sync files from SMB share to local directory
 *
 * This is the main function to call for synchronizing files.
 * It handles:
 * 1. VPN connection check
 * 2. Mounting the SMB share
 * 3. Copying files to local directory
 * 4. Unmounting the share
 */
export async function syncSibacFiles(): Promise<SmbSyncResult> {
  console.log("[SMB] Starting SIBAC file sync...");

  // Validate configuration
  const { valid, missing } = validateConfig();
  if (!valid) {
    return {
      success: false,
      message: `Configurazione SMB incompleta. Variabili mancanti: ${missing.join(", ")}`,
      filesFound: 0,
      filesSynced: 0,
      errors: [`Missing: ${missing.join(", ")}`],
    };
  }

  // Check VPN connection
  const vpnConnected = await isVpnConnected();
  if (!vpnConnected) {
    return {
      success: false,
      message: "VPN non connesso. Connettere al VPN prima di sincronizzare.",
      filesFound: 0,
      filesSynced: 0,
      errors: ["VPN not connected"],
    };
  }

  // Ensure local directory exists
  ensureLocalDirectory();

  // Mount the share
  const mountResult = await mountShare();
  if (!mountResult.success) {
    // Redact password from error message for security
    const safeError = redactPassword(mountResult.error ?? "Mount failed");
    return {
      success: false,
      message: `Impossibile montare la cartella condivisa: ${safeError}`,
      filesFound: 0,
      filesSynced: 0,
      errors: [safeError],
    };
  }

  try {
    // Count files in source path (mount point + subdirectory if configured)
    const sourcePath = getSourcePath();
    if (!existsSync(sourcePath)) {
      return {
        success: false,
        message: `Subdirectory "${SMB_CONFIG.subDirectory}" non trovata nella cartella condivisa.`,
        filesFound: 0,
        filesSynced: 0,
        errors: [`Subdirectory "${SMB_CONFIG.subDirectory}" not found`],
      };
    }

    const sourceFiles = readdirSync(sourcePath);
    const relevantFiles = sourceFiles.filter((f) =>
      SYNC_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext))
    );
    const filesFound = relevantFiles.length;

    console.log(`[SMB] Found ${filesFound} files to sync from ${sourcePath}`);

    // Sync files
    const { synced, errors } = syncFilesFromMount();

    // Count final local files
    const localFiles = existsSync(LOCAL_SIBAC_PATH)
      ? readdirSync(LOCAL_SIBAC_PATH).filter((f) =>
          SYNC_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext))
        )
      : [];

    return {
      success: errors.length === 0,
      message:
        errors.length === 0
          ? `Sincronizzazione completata. ${synced} file aggiornati, ${localFiles.length} file totali.`
          : `Sincronizzazione parziale. ${synced} file aggiornati, ${errors.length} errori.`,
      filesFound,
      filesSynced: synced,
      errors,
    };
  } finally {
    // Always try to unmount
    await unmountShare();
  }
}

/**
 * Get the count of files in local SIBAC directory
 */
export function getLocalSibacFileCount(): number {
  if (!existsSync(LOCAL_SIBAC_PATH)) {
    return 0;
  }

  try {
    const files = readdirSync(LOCAL_SIBAC_PATH);
    return files.filter((f) =>
      SYNC_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext))
    ).length;
  } catch {
    return 0;
  }
}

/**
 * Clear local SIBAC files (for testing/reset)
 */
export function clearLocalSibacFiles(): void {
  if (existsSync(LOCAL_SIBAC_PATH)) {
    const files = readdirSync(LOCAL_SIBAC_PATH);
    for (const file of files) {
      rmSync(join(LOCAL_SIBAC_PATH, file), { force: true });
    }
    console.log("[SMB] Local SIBAC files cleared");
  }
}

/**
 * List entry for lazy loading (single level, no recursion)
 */
export type SmbListEntry = {
  name: string;
  path: string;
  type: "file" | "folder";
  /** Number of items in folder (if folder) */
  itemCount?: number;
};

/**
 * List a single directory level (no recursion) for lazy loading
 */
function listDirectoryLevel(
  dirPath: string,
  relativePath = ""
): SmbListEntry[] {
  const entries: SmbListEntry[] = [];

  try {
    const items = readdirSync(dirPath);

    for (const item of items) {
      const itemPath = join(dirPath, item);
      const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;

      try {
        const stats = statSync(itemPath);

        if (stats.isDirectory()) {
          // Count items in subfolder for preview
          let itemCount = 0;
          try {
            itemCount = readdirSync(itemPath).length;
          } catch {
            // Can't read subfolder
          }

          entries.push({
            name: item,
            path: itemRelativePath,
            type: "folder",
            itemCount,
          });
        } else if (stats.isFile()) {
          // Check if it's a supported file type
          const hasValidExtension = SYNC_EXTENSIONS.some((ext) =>
            item.toLowerCase().endsWith(ext)
          );
          if (hasValidExtension) {
            entries.push({
              name: item,
              path: itemRelativePath,
              type: "file",
            });
          }
        }
      } catch {
        // Skip items we can't stat
      }
    }
  } catch (error) {
    console.error(`[SMB] Error listing directory ${dirPath}:`, error);
  }

  // Sort: folders first, then files, alphabetically
  return entries.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Browse a specific path in the SMB share (single level, for lazy loading)
 * @param smbPath - Relative path within the share (empty string for root)
 */
export async function browseSibacPath(smbPath = ""): Promise<{
  success: boolean;
  entries: SmbListEntry[];
  error?: string;
}> {
  console.log("[SMB] Browsing path:", smbPath || "(root)");

  // Validate configuration
  const { valid, missing } = validateConfig();
  if (!valid) {
    return {
      success: false,
      entries: [],
      error: ["Configurazione SMB incompleta:", missing.join(", ")].join(" "),
    };
  }

  // Check VPN connection
  const vpnConnected = await isVpnConnected();
  if (!vpnConnected) {
    return {
      success: false,
      entries: [],
      error: "VPN non connesso",
    };
  }

  // Mount the share
  const mountResult = await mountShare();
  if (!mountResult.success) {
    const safeError = redactPassword(mountResult.error ?? "Mount failed");
    return {
      success: false,
      entries: [],
      error: safeError,
    };
  }

  try {
    const targetPath = smbPath ? join(MOUNT_POINT, smbPath) : MOUNT_POINT;

    // Check if path exists
    if (!existsSync(targetPath)) {
      return {
        success: false,
        entries: [],
        error: ["Percorso non trovato:", smbPath].join(" "),
      };
    }

    const entries = listDirectoryLevel(targetPath, smbPath);
    console.log("[SMB] Found", entries.length, "items in", smbPath || "(root)");

    return {
      success: true,
      entries,
    };
  } catch (error) {
    const safeError = redactPassword(String(error));
    return {
      success: false,
      entries: [],
      error: safeError,
    };
  } finally {
    // Always unmount
    await unmountShare();
  }
}

/**
 * Read a specific file from the SMB share
 * @param filePath - Relative path to the file within the share
 */
export async function readSibacFile(filePath: string): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  console.log(`[SMB] Reading file: "${filePath}"`);

  // Validate configuration
  const { valid, missing } = validateConfig();
  if (!valid) {
    return {
      success: false,
      error: `Configurazione SMB incompleta: ${missing.join(", ")}`,
    };
  }

  // Check VPN connection
  const vpnConnected = await isVpnConnected();
  if (!vpnConnected) {
    return {
      success: false,
      error: "VPN non connesso",
    };
  }

  // Mount the share
  const mountResult = await mountShare();
  if (!mountResult.success) {
    const safeError = redactPassword(mountResult.error ?? "Mount failed");
    return {
      success: false,
      error: safeError,
    };
  }

  try {
    const targetPath = join(MOUNT_POINT, filePath);

    // Check if file exists
    if (!existsSync(targetPath)) {
      return {
        success: false,
        error: `File non trovato: ${filePath}`,
      };
    }

    const content = readFileSync(targetPath, "utf-8");
    return {
      success: true,
      content,
    };
  } catch (error) {
    const safeError = redactPassword(String(error));
    return {
      success: false,
      error: safeError,
    };
  } finally {
    // Always unmount
    await unmountShare();
  }
}

/**
 * Scan a directory and return its contents (recursive)
 */
function scanDirectory(dirPath: string, relativePath = ""): SmbFolder {
  const entries: SmbEntry[] = [];
  const subfolders: SmbFolder[] = [];
  const files: SmbEntry[] = [];

  try {
    const items = readdirSync(dirPath);

    for (const item of items) {
      const itemPath = join(dirPath, item);
      const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;

      try {
        const stats = statSync(itemPath);
        const entry: SmbEntry = {
          name: item,
          path: itemRelativePath,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
        };

        entries.push(entry);

        if (stats.isDirectory()) {
          // Recursively scan subdirectory
          const subfolder = scanDirectory(itemPath, itemRelativePath);
          subfolders.push(subfolder);
        } else if (stats.isFile()) {
          // Check if it's a supported file type
          const hasValidExtension = SYNC_EXTENSIONS.some((ext) =>
            item.toLowerCase().endsWith(ext)
          );
          if (hasValidExtension) {
            files.push(entry);
          }
        }
      } catch {
        // Skip items we can't stat
      }
    }
  } catch (error) {
    console.error(`[SMB] Error scanning directory ${dirPath}:`, error);
  }

  return {
    name: relativePath ? (relativePath.split("/").pop() ?? "") : "root",
    path: relativePath,
    entries,
    subfolders,
    files,
  };
}

/**
 * Browse the SMB share and return the folder structure
 * This mounts the share, scans the directory tree, and returns the hierarchy
 */
export async function browseSibacShare(): Promise<{
  success: boolean;
  root: SmbFolder | null;
  error?: string;
}> {
  console.log("[SMB] Browsing SIBAC share...");

  // Validate configuration
  const { valid, missing } = validateConfig();
  if (!valid) {
    return {
      success: false,
      root: null,
      error: `Configurazione SMB incompleta: ${missing.join(", ")}`,
    };
  }

  // Check VPN connection
  const vpnConnected = await isVpnConnected();
  if (!vpnConnected) {
    return {
      success: false,
      root: null,
      error: "VPN non connesso",
    };
  }

  // Mount the share
  const mountResult = await mountShare();
  if (!mountResult.success) {
    const safeError = redactPassword(mountResult.error ?? "Mount failed");
    return {
      success: false,
      root: null,
      error: safeError,
    };
  }

  try {
    // Scan the mounted share
    console.log(`[SMB] Scanning share at ${MOUNT_POINT}...`);
    const root = scanDirectory(MOUNT_POINT);

    console.log(
      `[SMB] Found ${root.subfolders.length} folders, ${root.files.length} files at root`
    );

    return {
      success: true,
      root,
    };
  } catch (error) {
    const safeError = redactPassword(String(error));
    return {
      success: false,
      root: null,
      error: safeError,
    };
  } finally {
    // Always unmount
    await unmountShare();
  }
}

/**
 * Get the mount point path (for external use)
 */
export function getMountPoint(): string {
  return MOUNT_POINT;
}

/**
 * Mount the share and return the mount point
 * Caller is responsible for unmounting
 */
export async function mountAndGetPath(): Promise<{
  success: boolean;
  mountPoint: string | null;
  error?: string;
}> {
  // Validate configuration
  const { valid, missing } = validateConfig();
  if (!valid) {
    return {
      success: false,
      mountPoint: null,
      error: `Configurazione SMB incompleta: ${missing.join(", ")}`,
    };
  }

  // Check VPN connection
  const vpnConnected = await isVpnConnected();
  if (!vpnConnected) {
    return {
      success: false,
      mountPoint: null,
      error: "VPN non connesso",
    };
  }

  // Mount the share
  const mountResult = await mountShare();
  if (!mountResult.success) {
    const safeError = redactPassword(mountResult.error ?? "Mount failed");
    return {
      success: false,
      mountPoint: null,
      error: safeError,
    };
  }

  return {
    success: true,
    mountPoint: MOUNT_POINT,
  };
}

/**
 * Unmount the share (public wrapper)
 */
export async function unmountSibacShare(): Promise<void> {
  await unmountShare();
}

/**
 * Check if SMB share is accessible (without full sync)
 */
export async function isSibacShareAccessible(): Promise<{
  accessible: boolean;
  message: string;
}> {
  // Check VPN first
  const vpnConnected = await isVpnConnected();
  if (!vpnConnected) {
    return {
      accessible: false,
      message: "VPN non connesso",
    };
  }

  // Validate config
  const { valid, missing } = validateConfig();
  if (!valid) {
    return {
      accessible: false,
      message: `Credenziali mancanti: ${missing.join(", ")}`,
    };
  }

  // Try to mount briefly
  const mountResult = await mountShare();
  if (!mountResult.success) {
    return {
      accessible: false,
      message: `Cartella non accessibile: ${mountResult.error}`,
    };
  }

  // Unmount and return success
  await unmountShare();
  return {
    accessible: true,
    message: "Cartella condivisa accessibile",
  };
}

/**
 * Get SMB configuration info (without sensitive data)
 */
export function getSmbInfo(): {
  host: string;
  shareName: string;
  subDirectory: string | undefined;
  localPath: string;
  configured: boolean;
} {
  const { valid } = validateConfig();
  return {
    host: SMB_CONFIG.host,
    shareName: SMB_CONFIG.shareName,
    subDirectory: SMB_CONFIG.subDirectory,
    localPath: LOCAL_SIBAC_PATH,
    configured: valid,
  };
}

/**
 * List available SMB shares on the Windows server
 * Useful for debugging share name issues
 */
export async function listAvailableShares(): Promise<{
  success: boolean;
  shares: string[];
  error?: string;
}> {
  // Check VPN first
  const vpnConnected = await isVpnConnected();
  if (!vpnConnected) {
    return {
      success: false,
      shares: [],
      error: "VPN non connesso",
    };
  }

  try {
    // On macOS, we can use smbutil to list shares
    if (PLATFORM === "darwin") {
      const { stdout: guestStdout } = await execAsync(
        `smbutil view -g //${SMB_CONFIG.host} 2>/dev/null || echo "Failed"`,
        { timeout: 15_000 }
      );

      if (guestStdout.includes("Failed")) {
        // Try with credentials
        const { stdout: authStdout } = await execAsync(
          `smbutil view //${SMB_CONFIG.username}:${SMB_CONFIG.password}@${SMB_CONFIG.host} 2>&1`,
          { timeout: 15_000 }
        );

        const shares = authStdout
          .split("\n")
          .filter((line) => line.includes("Disk"))
          .map((line) => line.trim().split(WHITESPACE_SPLIT_REGEX)[0])
          .filter(Boolean);

        return { success: true, shares };
      }

      const shares = guestStdout
        .split("\n")
        .filter((line) => line.includes("Disk"))
        .map((line) => line.trim().split(WHITESPACE_SPLIT_REGEX)[0])
        .filter(Boolean);

      return { success: true, shares };
    }

    // On Linux, use smbclient
    const { stdout: linuxStdout } = await execAsync(
      `smbclient -L //${SMB_CONFIG.host} -U ${SMB_CONFIG.username}%${SMB_CONFIG.password} 2>/dev/null`,
      { timeout: 15_000 }
    );

    const shares = linuxStdout
      .split("\n")
      .filter((line) => line.includes("Disk"))
      .map((line) => line.trim().split(WHITESPACE_SPLIT_REGEX)[0])
      .filter(Boolean);

    return { success: true, shares };
  } catch (error) {
    return {
      success: false,
      shares: [],
      error: `Errore listando share: ${error}`,
    };
  }
}

/**
 * Redact password from error messages for security
 */
function redactPassword(message: string): string {
  if (!SMB_CONFIG.password) {
    return message;
  }
  return message.replaceAll(SMB_CONFIG.password, "***");
}

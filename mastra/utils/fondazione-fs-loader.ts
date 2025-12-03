/**
 * Fondazione CON IL SUD - File System Loader
 *
 * Utilities for safely browsing and reading files from the Fondazione bandi directory.
 * Used by the fondazioneBrowser tool and the /api/fondazione/fs API route.
 *
 * Security:
 * - All paths are resolved relative to BASE_PATH
 * - Directory traversal attacks (../) are prevented via path validation
 * - Only files within the bandi directory can be accessed
 */

import fs from "node:fs";
import path from "node:path";

/**
 * Base path for the Fondazione CON IL SUD knowledge base
 */
export const BASE_PATH = path.join(
  process.cwd(),
  "mastra/knowledgebase/fondazione_con_il_sud"
);

/**
 * Represents a file or folder in the bandi directory
 */
export type FondazioneFsItem = {
  /** File or folder name */
  name: string;
  /** Type of item */
  type: "file" | "folder";
  /** Path relative to BASE_PATH, using forward slashes */
  path: string;
  /** File extension (lowercase, including dot) - only for files */
  extension?: string;
};

/**
 * Result of reading a file
 */
export type FondazioneFsReadResult = {
  /** Path relative to BASE_PATH */
  path: string;
  /** File content as UTF-8 string */
  content: string;
  /** File extension (lowercase, including dot) */
  extension: string | null;
};

/**
 * Error thrown when a path is invalid or escapes the base directory
 */
export class FondazioneFsSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FondazioneFsSecurityError";
  }
}

/**
 * Error thrown when a file or directory is not found
 */
export class FondazioneFsNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FondazioneFsNotFoundError";
  }
}

/**
 * Resolves a relative path safely within BASE_PATH.
 * Throws if the resolved path escapes the base directory.
 *
 * @param relativePath - Path relative to BASE_PATH (can be empty for root)
 * @returns Absolute path guaranteed to be within BASE_PATH
 * @throws {FondazioneFsSecurityError} If path escapes BASE_PATH
 */
export function resolveSafePath(relativePath: string): string {
  // Normalize the input: remove leading/trailing slashes, normalize separators
  const normalized = relativePath
    .replace(/\\/g, "/") // Convert backslashes to forward slashes
    .replace(/^\/+/, "") // Remove leading slashes
    .replace(/\/+$/, "") // Remove trailing slashes
    .replace(/\/+/g, "/"); // Collapse multiple slashes

  // Join with base path and resolve to absolute
  const resolvedPath = path.resolve(BASE_PATH, normalized);

  // Ensure the resolved path is within BASE_PATH
  // Use path.resolve on BASE_PATH too to ensure consistent comparison
  const normalizedBasePath = path.resolve(BASE_PATH);

  if (
    !resolvedPath.startsWith(normalizedBasePath + path.sep) &&
    resolvedPath !== normalizedBasePath
  ) {
    throw new FondazioneFsSecurityError(
      `Percorso non valido: il percorso "${relativePath}" non è consentito.`
    );
  }

  return resolvedPath;
}

/**
 * Converts an absolute path to a path relative to BASE_PATH using forward slashes.
 *
 * @param absolutePath - Absolute path within BASE_PATH
 * @returns Relative path using forward slashes, or "" for root
 */
function toRelativePath(absolutePath: string): string {
  const normalizedBasePath = path.resolve(BASE_PATH);
  const relative = path.relative(normalizedBasePath, absolutePath);
  // Convert to forward slashes for consistency
  return relative.replace(/\\/g, "/");
}

/**
 * Lists the contents of a directory within the bandi folder.
 *
 * @param relativePath - Path relative to BASE_PATH (empty string for root)
 * @returns Array of file/folder items sorted by type (folders first) then name
 * @throws {FondazioneFsSecurityError} If path escapes BASE_PATH
 * @throws {FondazioneFsNotFoundError} If directory doesn't exist
 */
export function listDirectory(relativePath = ""): FondazioneFsItem[] {
  const absolutePath = resolveSafePath(relativePath);

  // Check if path exists and is a directory
  if (!fs.existsSync(absolutePath)) {
    throw new FondazioneFsNotFoundError(
      `Cartella non trovata: "${relativePath || "/"}"`
    );
  }

  const stats = fs.statSync(absolutePath);
  if (!stats.isDirectory()) {
    throw new FondazioneFsNotFoundError(
      `Il percorso "${relativePath}" non è una cartella.`
    );
  }

  // Read directory entries
  const entries = fs.readdirSync(absolutePath, { withFileTypes: true });

  // Filter out hidden files and map to FondazioneFsItem
  const items: FondazioneFsItem[] = entries
    .filter((entry) => !entry.name.startsWith(".")) // Skip hidden files
    .map((entry) => {
      const itemAbsolutePath = path.join(absolutePath, entry.name);
      const itemRelativePath = toRelativePath(itemAbsolutePath);
      const isFile = entry.isFile();
      const extension = isFile
        ? path.extname(entry.name).toLowerCase()
        : undefined;

      return {
        name: entry.name,
        type: isFile ? ("file" as const) : ("folder" as const),
        path: itemRelativePath,
        ...(extension !== undefined && { extension }),
      };
    });

  // Sort: folders first, then by name (case-insensitive)
  items.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
  });

  return items;
}

/**
 * Reads the content of a file within the bandi folder.
 *
 * @param relativePath - Path relative to BASE_PATH
 * @returns Object with path, content, and extension
 * @throws {FondazioneFsSecurityError} If path escapes BASE_PATH
 * @throws {FondazioneFsNotFoundError} If file doesn't exist
 * @throws {Error} If path is a directory
 */
export function readFileContent(relativePath: string): FondazioneFsReadResult {
  if (!relativePath || relativePath.trim() === "") {
    throw new FondazioneFsNotFoundError(
      "È necessario specificare un percorso file."
    );
  }

  const absolutePath = resolveSafePath(relativePath);

  // Check if path exists
  if (!fs.existsSync(absolutePath)) {
    throw new FondazioneFsNotFoundError(
      `File non trovato: "${relativePath}"`
    );
  }

  const stats = fs.statSync(absolutePath);
  if (stats.isDirectory()) {
    throw new FondazioneFsNotFoundError(
      `Il percorso "${relativePath}" è una cartella, non un file.`
    );
  }

  // Read file content
  const content = fs.readFileSync(absolutePath, "utf8");
  const extension = path.extname(relativePath).toLowerCase() || null;

  return {
    path: toRelativePath(absolutePath),
    content,
    extension,
  };
}

/**
 * Computes the parent path of a given relative path.
 *
 * @param relativePath - Current path relative to BASE_PATH
 * @returns Parent path, or "" if already at root
 */
export function getParentPath(relativePath: string): string {
  if (!relativePath || relativePath === "") {
    return "";
  }

  const normalized = relativePath.replace(/\\/g, "/").replace(/\/+$/, "");
  const lastSlash = normalized.lastIndexOf("/");

  if (lastSlash === -1) {
    return ""; // Was at first level, parent is root
  }

  return normalized.slice(0, lastSlash);
}



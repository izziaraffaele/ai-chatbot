/**
 * SIBAC File Indexer
 *
 * Provides functions for indexing SIBAC shared folder files into PostgreSQL
 * for fast search without filesystem traversal.
 *
 * IMPORTANT: Never stores file content in DB (privacy requirement).
 * Only stores metadata and validation summaries.
 */

import { readdirSync, statSync } from "node:fs";
import { extname, join, dirname, basename } from "node:path";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sibacFileIndex, sibacIndexMeta } from "@/lib/db/schema";

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default base directory for SIBAC shared files */
const DEFAULT_SIBAC_PATH = join(
  process.cwd(),
  "mastra/knowledgebase/sibac-shared"
);

/** Supported file extensions for indexing */
const SUPPORTED_EXTENSIONS = new Set([".xml", ".pdf", ".doc", ".docx"]);

/** Batch size for database operations */
const DEFAULT_BATCH_SIZE = 100;

/** Log progress every N files */
const LOG_PROGRESS_INTERVAL = 250;

// ============================================================================
// TYPES
// ============================================================================

/**
 * Data for a single file index entry
 *
 * NOTE: Only stores file metadata, NOT invoice content (privacy requirement)
 */
export type FileIndexData = {
  path: string;
  parentPath: string;
  name: string;
  ext: string;
  size: number | null;
  mtime: Date | null;
  hash: string | null;
  searchText: string;
};

/**
 * Options for full scan indexing
 */
export type FullScanOptions = {
  baseDir?: string;
  onlyExt?: string;
  batchSize?: number;
  dryRun?: boolean;
  skipHash?: boolean;
  concurrency?: number;
  onProgress?: (current: number, total: number, file: string) => void;
};

/**
 * Options for incremental indexing
 */
export type IncrementalIndexOptions = {
  addedOrUpdatedPaths: string[];
  removedPaths: string[];
  baseDir?: string;
};

/**
 * Result of indexing operation
 */
export type IndexResult = {
  success: boolean;
  indexed: number;
  deleted: number;
  errors: number;
  errorMessages: string[];
};

// ============================================================================
// SEARCH TEXT BUILDER
// ============================================================================

/**
 * Build normalized search text from file index data
 *
 * Concatenates searchable fields with normalization:
 * - Lowercase for case-insensitive search
 * - Remove extra whitespace
 * - Includes filename and path only (no invoice content for privacy)
 *
 * @param data - Partial file index data with name and path
 * @returns Normalized search text string
 */
export function buildSearchText(
  data: Partial<FileIndexData> & { name: string; path: string }
): string {
  // Only include filename and path (privacy: no invoice data)
  const parts: string[] = [data.name, data.path];

  // Normalize: lowercase, collapse whitespace, trim
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// FILE PROCESSING
// ============================================================================

/**
 * Process a single file and extract index data
 *
 * NOTE: Only extracts file metadata, NOT invoice content (privacy requirement)
 *
 * @param filePath - Absolute path to the file
 * @param relativePath - Relative path from base directory
 * @param skipHash - Whether to skip hash calculation
 * @returns File index data or null if file cannot be processed
 */
function processFile(
  filePath: string,
  relativePath: string,
  skipHash = true
): FileIndexData | null {
  try {
    const stats = statSync(filePath);
    if (!stats.isFile()) {
      return null;
    }

    const ext = extname(relativePath).toLowerCase().slice(1); // Remove leading dot
    const name = basename(relativePath);
    const parentPath = dirname(relativePath) || ".";

    // File metadata only (privacy: no invoice content extraction)
    const fileData: FileIndexData = {
      path: relativePath,
      parentPath: parentPath === "." ? "" : parentPath,
      name,
      ext,
      size: stats.size,
      mtime: stats.mtime,
      hash: skipHash ? null : null, // TODO: implement hash if needed
      searchText: "",
    };

    // Build search text (name + path only)
    fileData.searchText = buildSearchText(fileData);

    return fileData;
  } catch (error) {
    console.error(`[SIBAC][INDEX] Error processing file ${relativePath}:`, error);
    return null;
  }
}

/**
 * Recursively walk a directory and collect file paths
 *
 * @param dir - Directory to walk
 * @param baseDir - Base directory for relative paths
 * @param onlyExt - Optional extension filter (without dot)
 * @returns Array of { absolutePath, relativePath }
 */
function walkDirectory(
  dir: string,
  baseDir: string,
  onlyExt?: string
): Array<{ absolutePath: string; relativePath: string }> {
  const results: Array<{ absolutePath: string; relativePath: string }> = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = join(dir, entry.name);
      const relativePath = absolutePath.slice(baseDir.length + 1); // Remove baseDir + separator

      if (entry.isDirectory()) {
        // Recurse into subdirectory
        results.push(...walkDirectory(absolutePath, baseDir, onlyExt));
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();

        // Check if extension is supported
        if (!SUPPORTED_EXTENSIONS.has(ext)) {
          continue;
        }

        // Apply extension filter if specified
        if (onlyExt && ext !== `.${onlyExt}`) {
          continue;
        }

        results.push({ absolutePath, relativePath });
      }
    }
  } catch (error) {
    console.error(`[SIBAC][INDEX] Error reading directory ${dir}:`, error);
  }

  return results;
}

// ============================================================================
// INDEX VERSION MANAGEMENT
// ============================================================================

/**
 * Get the current index version
 *
 * @returns Current version number
 */
export async function getIndexVersion(): Promise<number> {
  try {
    const result = await db
      .select()
      .from(sibacIndexMeta)
      .where(eq(sibacIndexMeta.key, "indexVersion"))
      .limit(1);

    if (result.length > 0) {
      return Number.parseInt(result[0].value, 10) || 1;
    }
    return 1;
  } catch {
    return 1;
  }
}

/**
 * Increment the index version to invalidate caches
 *
 * @returns New version number
 */
export async function incrementIndexVersion(): Promise<number> {
  const currentVersion = await getIndexVersion();
  const newVersion = currentVersion + 1;

  await db
    .insert(sibacIndexMeta)
    .values({
      key: "indexVersion",
      value: String(newVersion),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: sibacIndexMeta.key,
      set: {
        value: String(newVersion),
        updatedAt: new Date(),
      },
    });

  console.log(`[SIBAC][INDEX] Index version incremented to ${newVersion}`);
  return newVersion;
}

// ============================================================================
// FULL SCAN INDEXING
// ============================================================================

/**
 * Perform a full scan of the SIBAC shared directory and index all files
 *
 * @param options - Indexing options
 * @returns Index result with counts
 */
export async function indexFullScanSibacShared(
  options: FullScanOptions = {}
): Promise<IndexResult> {
  const {
    baseDir = DEFAULT_SIBAC_PATH,
    onlyExt,
    batchSize = DEFAULT_BATCH_SIZE,
    dryRun = false,
    skipHash = true,
    onProgress,
  } = options;

  console.log(`[SIBAC][REINDEX] Starting full scan of ${baseDir}`);
  console.log(`[SIBAC][REINDEX] Options: onlyExt=${onlyExt ?? "all"}, batchSize=${batchSize}, dryRun=${dryRun}`);

  const result: IndexResult = {
    success: true,
    indexed: 0,
    deleted: 0,
    errors: 0,
    errorMessages: [],
  };

  try {
    // Walk directory and collect all files
    const files = walkDirectory(baseDir, baseDir, onlyExt);
    const totalFiles = files.length;

    console.log(`[SIBAC][REINDEX] Found ${totalFiles} files to index`);

    if (totalFiles === 0) {
      console.log("[SIBAC][REINDEX] No files found, nothing to index");
      return result;
    }

    // Process files in batches
    const batch: FileIndexData[] = [];
    let processedCount = 0;

    for (const { absolutePath, relativePath } of files) {
      processedCount++;

      // Progress logging
      if (processedCount % LOG_PROGRESS_INTERVAL === 0 || processedCount === totalFiles) {
        const percentage = ((processedCount / totalFiles) * 100).toFixed(1);
        console.log(
          `[SIBAC][REINDEX] Progress: ${processedCount}/${totalFiles} files (${percentage}%)`
        );
      }

      if (onProgress) {
        onProgress(processedCount, totalFiles, relativePath);
      }

      // Process file
      const fileData = processFile(absolutePath, relativePath, skipHash);
      if (!fileData) {
        result.errors++;
        result.errorMessages.push(`Failed to process: ${relativePath}`);
        continue;
      }

      batch.push(fileData);

      // Flush batch when full
      if (batch.length >= batchSize) {
        if (dryRun) {
          result.indexed += batch.length;
        } else {
          const flushed = await flushBatch(batch);
          result.indexed += flushed;
        }
        batch.length = 0; // Clear batch
      }
    }

    // Flush remaining batch
    if (batch.length > 0) {
      if (dryRun) {
        result.indexed += batch.length;
      } else {
        const flushed = await flushBatch(batch);
        result.indexed += flushed;
      }
    }

    // Increment version to invalidate caches
    if (!dryRun && result.indexed > 0) {
      await incrementIndexVersion();
    }

    console.log(
      `[SIBAC][REINDEX] Complete: ${result.indexed} indexed, ${result.errors} errors`
    );

    return result;
  } catch (error) {
    console.error("[SIBAC][REINDEX] Fatal error:", error);
    result.success = false;
    result.errorMessages.push(`Fatal error: ${error}`);
    return result;
  }
}

/**
 * Flush a batch of file data to the database using UPSERT
 *
 * @param batch - Array of file index data
 * @returns Number of successfully upserted rows
 */
async function flushBatch(batch: FileIndexData[]): Promise<number> {
  if (batch.length === 0) {
    return 0;
  }

  try {
    // Use raw SQL for batch upsert with ON CONFLICT
    for (const data of batch) {
      await db
        .insert(sibacFileIndex)
        .values({
          source: "sibac-shared",
          path: data.path,
          parentPath: data.parentPath,
          name: data.name,
          ext: data.ext,
          size: data.size,
          mtime: data.mtime,
          hash: data.hash,
          searchText: data.searchText,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: sibacFileIndex.path,
          set: {
            parentPath: data.parentPath,
            name: data.name,
            ext: data.ext,
            size: data.size,
            mtime: data.mtime,
            hash: data.hash,
            searchText: data.searchText,
            updatedAt: new Date(),
          },
        });
    }

    return batch.length;
  } catch (error) {
    console.error("[SIBAC][INDEX] Batch upsert error:", error);
    return 0;
  }
}

// ============================================================================
// INCREMENTAL INDEXING
// ============================================================================

/**
 * Update the index incrementally based on changed paths
 *
 * @param options - Incremental index options with added/updated/removed paths
 * @returns Index result
 */
export async function indexSibacChanges(
  options: IncrementalIndexOptions
): Promise<IndexResult> {
  const {
    addedOrUpdatedPaths,
    removedPaths,
    baseDir = DEFAULT_SIBAC_PATH,
  } = options;

  console.log(
    `[SIBAC][INDEX] Incremental update: ${addedOrUpdatedPaths.length} added/updated, ${removedPaths.length} removed`
  );

  const result: IndexResult = {
    success: true,
    indexed: 0,
    deleted: 0,
    errors: 0,
    errorMessages: [],
  };

  // Process added/updated files
  for (const relativePath of addedOrUpdatedPaths) {
    const absolutePath = join(baseDir, relativePath);
    const fileData = processFile(absolutePath, relativePath, true);

    if (!fileData) {
      result.errors++;
      result.errorMessages.push(`Failed to process: ${relativePath}`);
      continue;
    }

    try {
      await db
        .insert(sibacFileIndex)
        .values({
          source: "sibac-shared",
          path: fileData.path,
          parentPath: fileData.parentPath,
          name: fileData.name,
          ext: fileData.ext,
          size: fileData.size,
          mtime: fileData.mtime,
          hash: fileData.hash,
          searchText: fileData.searchText,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: sibacFileIndex.path,
          set: {
            parentPath: fileData.parentPath,
            name: fileData.name,
            ext: fileData.ext,
            size: fileData.size,
            mtime: fileData.mtime,
            hash: fileData.hash,
            searchText: fileData.searchText,
            updatedAt: new Date(),
          },
        });

      result.indexed++;
    } catch (error) {
      result.errors++;
      result.errorMessages.push(`DB error for ${relativePath}: ${error}`);
    }
  }

  // Process removed files
  for (const relativePath of removedPaths) {
    try {
      await db
        .delete(sibacFileIndex)
        .where(eq(sibacFileIndex.path, relativePath));

      result.deleted++;
    } catch (error) {
      result.errors++;
      result.errorMessages.push(`Delete error for ${relativePath}: ${error}`);
    }
  }

  // Increment version if any changes were made
  if (result.indexed > 0 || result.deleted > 0) {
    await incrementIndexVersion();
  }

  console.log(
    `[SIBAC][INDEX] Complete: upserted=${result.indexed} deleted=${result.deleted} errors=${result.errors}`
  );

  return result;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the total count of indexed files
 *
 * @returns Total file count
 */
export async function getIndexedFileCount(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sibacFileIndex);

  return result[0]?.count ?? 0;
}

/**
 * Clear all indexed files (use with caution!)
 *
 * @returns Number of deleted rows
 */
export async function clearIndex(): Promise<number> {
  const result = await db.delete(sibacFileIndex).returning({ id: sibacFileIndex.id });
  await incrementIndexVersion();
  return result.length;
}

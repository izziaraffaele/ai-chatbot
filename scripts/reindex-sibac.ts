#!/usr/bin/env tsx
/**
 * SIBAC File Index Reindex Script
 *
 * Rebuilds the SIBAC file index from scratch.
 * Run this script overnight to ensure the index is up-to-date.
 *
 * Usage:
 *   pnpm tsx scripts/reindex-sibac.ts [options]
 *
 * Options:
 *   --baseDir=<path>     Base directory (default: mastra/knowledgebase/sibac-shared)
 *   --onlyExt=<ext>      Only index files with this extension (e.g., xml)
 *   --batchSize=<n>      Batch size for DB operations (default: 500)
 *   --dryRun             Don't actually write to DB, just show what would be indexed
 *   --skipHash           Skip hash calculation (default: true)
 *   --concurrency=<n>    Parallel processing concurrency (default: 1)
 *
 * Examples:
 *   pnpm tsx scripts/reindex-sibac.ts
 *   pnpm tsx scripts/reindex-sibac.ts --onlyExt=xml --batchSize=500
 *   pnpm tsx scripts/reindex-sibac.ts --dryRun
 */

import { join } from "node:path";
import "dotenv/config";

// Validate environment
if (!process.env.POSTGRES_URL) {
  console.error("[SIBAC][REINDEX] Error: POSTGRES_URL environment variable is not set");
  console.error("[SIBAC][REINDEX] Please set POSTGRES_URL in your .env file or environment");
  process.exit(1);
}

// Import after dotenv is loaded
import {
  indexFullScanSibacShared,
  getIndexedFileCount,
  type FullScanOptions,
} from "../lib/sibac/indexer";

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

type CliArgs = {
  baseDir: string;
  onlyExt?: string;
  batchSize: number;
  dryRun: boolean;
  skipHash: boolean;
  concurrency: number;
  help: boolean;
};

function parseArgs(): CliArgs {
  const args: CliArgs = {
    baseDir: join(process.cwd(), "mastra/knowledgebase/sibac-shared"),
    batchSize: 500,
    dryRun: false,
    skipHash: true,
    concurrency: 1,
    help: false,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--dryRun" || arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--skipHash" || arg === "--skip-hash") {
      args.skipHash = true;
    } else if (arg.startsWith("--baseDir=")) {
      args.baseDir = arg.split("=")[1];
    } else if (arg.startsWith("--onlyExt=")) {
      args.onlyExt = arg.split("=")[1];
    } else if (arg.startsWith("--batchSize=")) {
      const value = Number.parseInt(arg.split("=")[1], 10);
      if (!Number.isNaN(value) && value > 0) {
        args.batchSize = value;
      }
    } else if (arg.startsWith("--concurrency=")) {
      const value = Number.parseInt(arg.split("=")[1], 10);
      if (!Number.isNaN(value) && value > 0) {
        args.concurrency = value;
      }
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
SIBAC File Index Reindex Script

Rebuilds the SIBAC file index from scratch.
Run this script overnight to ensure the index is up-to-date.

Usage:
  pnpm tsx scripts/reindex-sibac.ts [options]

Options:
  --baseDir=<path>     Base directory (default: mastra/knowledgebase/sibac-shared)
  --onlyExt=<ext>      Only index files with this extension (e.g., xml)
  --batchSize=<n>      Batch size for DB operations (default: 500)
  --dryRun             Don't actually write to DB, just show what would be indexed
  --skipHash           Skip hash calculation (default: true)
  --concurrency=<n>    Parallel processing concurrency (default: 1)
  --help, -h           Show this help message

Examples:
  pnpm tsx scripts/reindex-sibac.ts
  pnpm tsx scripts/reindex-sibac.ts --onlyExt=xml --batchSize=500
  pnpm tsx scripts/reindex-sibac.ts --dryRun
  npx tsx scripts/reindex-sibac.ts --onlyExt=xml --batchSize=500 --concurrency=4
`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log("=".repeat(60));
  console.log("[SIBAC][REINDEX] Starting SIBAC file reindex");
  console.log("=".repeat(60));
  console.log("");
  console.log("Configuration:");
  console.log(`  Base Directory: ${args.baseDir}`);
  console.log(`  Only Extension: ${args.onlyExt ?? "all"}`);
  console.log(`  Batch Size: ${args.batchSize}`);
  console.log(`  Dry Run: ${args.dryRun}`);
  console.log(`  Skip Hash: ${args.skipHash}`);
  console.log(`  Concurrency: ${args.concurrency}`);
  console.log("");

  // Get initial count
  let initialCount = 0;
  try {
    initialCount = await getIndexedFileCount();
    console.log(`[SIBAC][REINDEX] Current indexed files: ${initialCount}`);
  } catch (error) {
    console.warn("[SIBAC][REINDEX] Could not get initial count:", error);
  }

  console.log("");
  console.log("[SIBAC][REINDEX] Starting full scan...");
  console.log("");

  const startTime = Date.now();

  // Build options
  const options: FullScanOptions = {
    baseDir: args.baseDir,
    onlyExt: args.onlyExt,
    batchSize: args.batchSize,
    dryRun: args.dryRun,
    skipHash: args.skipHash,
    concurrency: args.concurrency,
    onProgress: (current, total, file) => {
      // Progress is already logged by the indexer, but we can add extra info here
      if (current === total) {
        console.log(`[SIBAC][REINDEX] Last file: ${file}`);
      }
    },
  };

  // Run the indexer
  const result = await indexFullScanSibacShared(options);

  const elapsed = Date.now() - startTime;
  const elapsedSeconds = (elapsed / 1000).toFixed(2);

  console.log("");
  console.log("=".repeat(60));
  console.log("[SIBAC][REINDEX] Reindex Complete");
  console.log("=".repeat(60));
  console.log("");
  console.log("Results:");
  console.log(`  Success: ${result.success}`);
  console.log(`  Files Indexed: ${result.indexed}`);
  console.log(`  Files Deleted: ${result.deleted}`);
  console.log(`  Errors: ${result.errors}`);
  console.log(`  Time Elapsed: ${elapsedSeconds}s`);

  if (result.indexed > 0) {
    const filesPerSecond = (result.indexed / (elapsed / 1000)).toFixed(2);
    console.log(`  Rate: ${filesPerSecond} files/second`);
  }

  if (result.errorMessages.length > 0) {
    console.log("");
    console.log("Error Messages (first 10):");
    for (const msg of result.errorMessages.slice(0, 10)) {
      console.log(`  - ${msg}`);
    }
    if (result.errorMessages.length > 10) {
      console.log(`  ... and ${result.errorMessages.length - 10} more`);
    }
  }

  // Get final count
  try {
    const finalCount = await getIndexedFileCount();
    console.log("");
    console.log(`[SIBAC][REINDEX] Final indexed files: ${finalCount}`);
    console.log(`[SIBAC][REINDEX] Change: ${finalCount - initialCount >= 0 ? "+" : ""}${finalCount - initialCount}`);
  } catch (error) {
    console.warn("[SIBAC][REINDEX] Could not get final count:", error);
  }

  console.log("");

  // Exit with appropriate code
  if (!result.success) {
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error("[SIBAC][REINDEX] Fatal error:", error);
  process.exit(1);
});

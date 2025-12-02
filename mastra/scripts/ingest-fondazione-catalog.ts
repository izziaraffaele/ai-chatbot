#!/usr/bin/env tsx
/**
 * Fondazione CON IL SUD Catalog Ingestion Script
 *
 * Ingests the Fondazione knowledge base (chairos.md, website_kb.md) into pgvector.
 * Run this script after:
 * - Initial setup
 * - Adding new source files to FONDAZIONE_CATALOG
 * - Updating existing source files
 *
 * Usage:
 *   pnpm tsx mastra/scripts/ingest-fondazione-catalog.ts
 *
 * Or via npm script:
 *   pnpm catalog:ingest:fondazione
 *
 * Requirements:
 *   - POSTGRES_URL env var must be set
 *   - OPENAI_API_KEY env var must be set
 *
 * Environment loading:
 *   - This script explicitly loads variables from .env.local so that
 *     POSTGRES_URL and OPENAI_API_KEY defined there are available
 *     before pgvector is initialized.
 */

import { config } from "dotenv";

// Load environment variables from .env.local before importing modules that
// depend on POSTGRES_URL (e.g., pgvector store and ingestion utilities).
config({ path: ".env.local" });

async function main() {
  const { FONDAZIONE_CATALOG } = await import("../utils/catalog-config");
  const { ingestCatalog } = await import("../utils/catalog-ingest");

  console.log("════════════════════════════════════════════════════════════");
  console.log("  Fondazione CON IL SUD - Catalog Ingestion");
  console.log("════════════════════════════════════════════════════════════");

  // Validate environment variables
  if (!process.env.POSTGRES_URL) {
    console.error("\n❌ Error: POSTGRES_URL is not set");
    console.error("   Please set it in your .env file or environment\n");
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("\n❌ Error: OPENAI_API_KEY is not set");
    console.error("   Please set it in your .env file or environment\n");
    process.exit(1);
  }

  console.log("\nConfiguration:");
  console.log(`  KB ID: ${FONDAZIONE_CATALOG.kbId}`);
  console.log(`  Index: ${FONDAZIONE_CATALOG.indexName}`);
  console.log(`  Sources: ${FONDAZIONE_CATALOG.sources.length}`);
  for (const source of FONDAZIONE_CATALOG.sources) {
    console.log(`    - ${source.id}: ${source.filePath}`);
  }

  try {
    await ingestCatalog(FONDAZIONE_CATALOG);
    console.log("════════════════════════════════════════════════════════════");
    console.log("  ✅ Ingestion completed successfully!");
    console.log(
      "════════════════════════════════════════════════════════════\n"
    );
  } catch (error) {
    console.error("\n❌ Ingestion failed:", error);
    process.exit(1);
  }
}

main();

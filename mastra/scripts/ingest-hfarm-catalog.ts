#!/usr/bin/env tsx
/**
 * H-FARM Knowledge Base Catalog Ingestion Script
 *
 * Ingests the H-FARM knowledge base (knowledgebase.md) into pgvector.
 *
 * Usage:
 *   pnpm tsx mastra/scripts/ingest-hfarm-catalog.ts
 *
 * Or via npm script:
 *   pnpm catalog:ingest:hfarm
 *
 * Requirements:
 *   - POSTGRES_URL env var must be set
 *   - OPENAI_API_KEY env var must be set
 *   - PostgreSQL must have pgvector extension enabled
 */

import { config } from "dotenv";

// Load environment variables from .env.local BEFORE importing modules
// that depend on POSTGRES_URL
config({ path: ".env.local" });

async function main() {
  console.log("\n🚀 H-FARM Knowledge Base Ingestion\n");

  // Validate environment variables
  if (!process.env.POSTGRES_URL) {
    console.error("❌ Error: POSTGRES_URL is not set");
    console.error("   Please set POSTGRES_URL in your .env.local file");
    console.error(
      "   Example: POSTGRES_URL=postgresql://user:pass@host:5432/db\n"
    );
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Error: OPENAI_API_KEY is not set");
    console.error("   Please set OPENAI_API_KEY in your .env.local file\n");
    process.exit(1);
  }

  console.log("✅ Environment variables validated");
  console.log(`   POSTGRES_URL: ${process.env.POSTGRES_URL.slice(0, 30)}...`);
  console.log(
    `   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY.slice(0, 10)}...`
  );

  // Dynamic imports after env vars are loaded
  const { HFARM_CATALOG } = await import("../utils/catalog-config");
  const { ingestCatalog } = await import("../utils/catalog-ingest");

  try {
    await ingestCatalog(HFARM_CATALOG);
    console.log("✅ Ingestion completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Ingestion failed:", error);
    process.exit(1);
  }
}

main();

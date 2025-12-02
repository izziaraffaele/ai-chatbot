/**
 * PgVector Store Configuration
 *
 * Singleton PgVector instance shared across all catalogs and tools.
 * Requires POSTGRES_URL environment variable.
 */

import { PgVector } from "@mastra/pg";

/**
 * Store name used when registering with Mastra
 * This name is referenced by createVectorQueryTool
 */
export const PGVECTOR_STORE_NAME = "pgVector" as const;

/**
 * Shared PgVector store instance
 *
 * Note: This will throw if POSTGRES_URL is not set.
 * Ensure the env var is configured before importing this module.
 */
export const pgVector = new PgVector({
  connectionString: process.env.POSTGRES_URL ?? "",
});

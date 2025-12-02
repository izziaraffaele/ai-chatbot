/**
 * Shared Embedding Model Configuration
 *
 * Single source of truth for the embedding model used across all catalogs.
 * Changing this model requires re-running all ingestion scripts.
 */

import { openai } from "@ai-sdk/openai";

/**
 * Embedding model ID for reference
 */
export const EMBEDDING_MODEL_ID = "text-embedding-3-small";

/**
 * Embedding dimension for text-embedding-3-small
 * This must match the index dimension when creating pgvector indexes
 */
export const EMBEDDING_DIMENSION = 1536;

/**
 * Shared embedding model instance
 * Used by both ingestion scripts and catalog tools
 */
export const embeddingModel = openai.embedding(EMBEDDING_MODEL_ID);

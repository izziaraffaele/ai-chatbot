/**
 * Mastra Vectors Module
 *
 * Exports shared embedding model and vector store configurations.
 * Used by ingestion scripts, catalog tools, and the Mastra instance.
 */

export {
  EMBEDDING_DIMENSION,
  EMBEDDING_MODEL_ID,
  embeddingModel,
} from "./embedder";

export { PGVECTOR_STORE_NAME, pgVector } from "./pgvector";

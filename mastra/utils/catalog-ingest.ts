/**
 * Catalog Ingestion Utility
 *
 * Generic utilities for ingesting markdown files into pgvector.
 * Handles chunking, embedding generation, and vector upsert.
 *
 * Usage:
 *   import { ingestCatalog } from "./catalog-ingest";
 *   import { FONDAZIONE_CATALOG } from "./catalog-config";
 *   await ingestCatalog(FONDAZIONE_CATALOG);
 */

import fs from "node:fs/promises";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { EMBEDDING_DIMENSION, embeddingModel } from "../vectors/embedder";
import { pgVector } from "../vectors/pgvector";
import type { CatalogDefinition, CatalogSource } from "./catalog-config";

/**
 * Chunking configuration for markdown documents
 */
const CHUNK_CONFIG = {
  /** Chunking strategy - recursive works well for markdown */
  strategy: "recursive" as const,
  /** Maximum characters per chunk */
  maxSize: 1024,
  /** Overlap between chunks for context continuity */
  overlap: 128,
};

/**
 * Ingest a single markdown source into pgvector
 *
 * @param catalog - The catalog definition containing index name and kbId
 * @param source - The source file to ingest
 */
async function ingestSource(
  catalog: CatalogDefinition,
  source: CatalogSource
): Promise<void> {
  console.log(`  [${source.id}] Reading file: ${source.filePath}`);

  const markdown = await fs.readFile(source.filePath, "utf8");

  // Create document from markdown
  const doc = MDocument.fromMarkdown(markdown);

  // Chunk the document
  const chunks = await doc.chunk(CHUNK_CONFIG);

  if (chunks.length === 0) {
    console.log(`  [${source.id}] No chunks generated, skipping`);
    return;
  }

  console.log(`  [${source.id}] Generated ${chunks.length} chunks`);

  // Generate embeddings for all chunks
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks.map((chunk) => chunk.text),
  });

  console.log(`  [${source.id}] Generated ${embeddings.length} embeddings`);

  // Create index if it doesn't exist (idempotent operation)
  try {
    await pgVector.createIndex({
      indexName: catalog.indexName,
      dimension: EMBEDDING_DIMENSION,
      metric: "cosine",
    });
    console.log(`  [${source.id}] Index "${catalog.indexName}" ready`);
  } catch {
    // Index likely already exists, continue
    console.log(`  [${source.id}] Index "${catalog.indexName}" already exists`);
  }

  // Prepare vectors with metadata for upsert
  const vectors = chunks.map((chunk, i) => ({
    id: `${catalog.kbId}:${source.id}:${i}`,
    vector: embeddings.at(i) ?? [],
    metadata: {
      kbId: catalog.kbId,
      sourceId: source.id,
      filePath: source.filePath,
      chunkIndex: i,
      text: chunk.text,
      // Include any parsed metadata from MDocument (headings, etc.)
      ...(chunk.metadata ?? {}),
    },
  }));

  // Upsert vectors to pgvector
  await pgVector.upsert({
    indexName: catalog.indexName,
    vectors: vectors.map((v) => v.vector),
    metadata: vectors.map((v) => v.metadata),
    ids: vectors.map((v) => v.id),
  });

  console.log(`  [${source.id}] Upserted ${vectors.length} vectors`);
}

/**
 * Ingest all sources in a catalog definition into pgvector
 *
 * This function:
 * 1. Reads each markdown source file
 * 2. Chunks the content using recursive strategy
 * 3. Generates embeddings using the shared embedding model
 * 4. Creates the pgvector index if needed
 * 5. Upserts all vectors with rich metadata
 *
 * Note: Re-running ingestion will update existing vectors (upsert by ID)
 *
 * @param catalog - The catalog definition to ingest
 */
export async function ingestCatalog(catalog: CatalogDefinition): Promise<void> {
  console.log(`\nIngesting catalog: ${catalog.kbId}`);
  console.log(`Index name: ${catalog.indexName}`);
  console.log(`Sources: ${catalog.sources.length}`);

  for (const source of catalog.sources) {
    await ingestSource(catalog, source);
  }

  console.log(`\nCatalog "${catalog.kbId}" ingestion complete\n`);
}

/**
 * Delete all vectors for a specific source within a catalog
 * Useful for re-indexing a single source without affecting others
 *
 * @param catalog - The catalog definition
 * @param sourceId - The source ID to delete (e.g., "chairos")
 */
export function deleteSourceVectors(
  catalog: CatalogDefinition,
  sourceId: string
): void {
  console.log(
    `Deleting vectors for source "${sourceId}" in catalog "${catalog.kbId}"`
  );

  // Find the source to get chunk count estimate
  const source = catalog.sources.find((s) => s.id === sourceId);
  if (!source) {
    console.log(`Source "${sourceId}" not found in catalog`);
    return;
  }

  // Note: pgvector doesn't have a bulk delete by metadata filter
  // This would need to be implemented if needed
  console.log("Note: Bulk delete by metadata not implemented");
  console.log("Re-run ingestion to update vectors (upsert handles updates)");
}

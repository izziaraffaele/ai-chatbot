/**
 * Catalog Ingestion Utility
 *
 * Provides functions for ingesting markdown documents into pgvector.
 * Handles chunking, embedding generation, and vector storage.
 *
 * Usage:
 *   import { ingestCatalog } from './catalog-ingest';
 *   import { HFARM_CATALOG } from './catalog-config';
 *   await ingestCatalog(HFARM_CATALOG);
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
  size: 1024,
  /** Overlap between chunks for context continuity */
  overlap: 128,
};

/**
 * Ingest a single source file into pgvector
 *
 * @param catalog - The catalog definition
 * @param source - The source file to ingest
 */
async function ingestSource(
  catalog: CatalogDefinition,
  source: CatalogSource
): Promise<void> {
  console.log(`  Processing source: ${source.id}`);
  console.log(`    File: ${source.filePath}`);

  // Read markdown file
  let markdown: string;
  try {
    markdown = await fs.readFile(source.filePath, "utf8");
  } catch (error) {
    console.error(`    ❌ Error reading file: ${source.filePath}`);
    throw error;
  }

  if (markdown.trim().length === 0) {
    console.log("    ⚠️ File is empty, skipping...");
    return;
  }

  // Create document and chunk
  const doc = MDocument.fromMarkdown(markdown);
  const chunks = await doc.chunk(CHUNK_CONFIG);

  console.log(`    Chunks created: ${chunks.length}`);

  if (chunks.length === 0) {
    console.log("    ⚠️ No chunks generated, skipping...");
    return;
  }

  // Generate embeddings in batches
  console.log("    Generating embeddings...");
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks.map((chunk) => chunk.text),
  });

  console.log(`    Embeddings generated: ${embeddings.length}`);

  // Create index if it doesn't exist (using HNSW for better performance)
  try {
    await pgVector.createIndex({
      indexName: catalog.indexName,
      dimension: EMBEDDING_DIMENSION,
      metric: "cosine",
      indexConfig: {
        type: "hnsw",
        hnsw: {
          m: 16, // Maximum connections per node (default: 8, higher = better recall)
          efConstruction: 64, // Build-time complexity (default: 32, higher = better quality)
        },
      },
    });
    console.log(
      `    Index "${catalog.indexName}" created with HNSW (m=16, efConstruction=64)`
    );
  } catch {
    // Index likely already exists, continue
    console.log(`    Index "${catalog.indexName}" already exists`);
  }

  // Prepare vectors with metadata
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

  // Upsert vectors into pgvector
  console.log("    Upserting vectors...");
  await pgVector.upsert({
    indexName: catalog.indexName,
    vectors: vectors.map((v) => v.vector),
    metadata: vectors.map((v) => v.metadata),
    ids: vectors.map((v) => v.id),
  });

  console.log(
    `    ✅ Source "${source.id}" ingested: ${vectors.length} vectors`
  );
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
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Ingesting catalog: ${catalog.kbId}`);
  console.log(`Index name: ${catalog.indexName}`);
  console.log(`Sources: ${catalog.sources.length}`);
  console.log(`${"=".repeat(60)}\n`);

  for (const source of catalog.sources) {
    await ingestSource(catalog, source);
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ Catalog "${catalog.kbId}" ingestion complete`);
  console.log(`${"=".repeat(60)}\n`);
}

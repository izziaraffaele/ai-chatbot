/**
 * Catalog Configuration
 *
 * Generic types and configurations for pgvector-based knowledge base catalogs.
 * Each catalog definition specifies:
 * - kbId: Logical knowledge base identifier (used in metadata)
 * - indexName: pgvector index name (snake_case, no spaces)
 * - sources: Array of markdown files to ingest
 *
 * To add a new catalog:
 * 1. Define a new CatalogDefinition constant
 * 2. Create an ingestion script using ingestCatalog()
 * 3. Create a tool using the catalog search pattern
 */

import path from "node:path";

/**
 * A single markdown source file within a catalog
 */
export type CatalogSource = {
  /** Logical source id, e.g. "knowledgebase" | "docs" */
  id: string;
  /** Absolute or project-relative path to a markdown file */
  filePath: string;
};

/**
 * A catalog definition describing a knowledge base for vector search
 */
export type CatalogDefinition = {
  /** Logical knowledge base id (used in metadata) */
  kbId: string;
  /** Vector index name in pgvector (snake_case, no spaces) */
  indexName: string;
  /** List of markdown files to ingest */
  sources: CatalogSource[];
};

/**
 * H-FARM Knowledge Base Catalog
 *
 * Knowledge base for the H-FARM student assistant agent.
 * Contains educational content, course information, and campus details.
 */
export const HFARM_CATALOG: CatalogDefinition = {
  kbId: "hfarm",
  indexName: "hfarm_catalog",
  sources: [
    {
      id: "knowledgebase",
      filePath: path.join(
        process.cwd(),
        "mastra/knowledgebase/hfarm/knowledgebase.md"
      ),
    },
  ],
};

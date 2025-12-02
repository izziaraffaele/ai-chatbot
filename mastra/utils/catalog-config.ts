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
 * 3. Create a tool using createCatalogTool()
 */

import path from "node:path";

/**
 * A single markdown source file within a catalog
 */
export type CatalogSource = {
  /** Logical source id, e.g. "chairos" | "website" */
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
 * Fondazione CON IL SUD Catalog
 *
 * Knowledge base for the Fondazione CON IL SUD agent.
 * Includes:
 * - chairos.md: Manuale operativo Chairos (procedures, forms, guidelines)
 * - website_kb.md: Website content (mission, governance, projects, contacts)
 *
 * To extend this catalog, add new sources to the sources array
 * and re-run the ingestion script.
 */
export const FONDAZIONE_CATALOG: CatalogDefinition = {
  kbId: "fondazione_con_il_sud",
  indexName: "fondazione_catalog",
  sources: [
    {
      id: "chairos",
      filePath: path.join(
        process.cwd(),
        "mastra/knowledgebase/fondazione_con_il_sud/chairos.md"
      ),
    },
    {
      id: "website",
      filePath: path.join(
        process.cwd(),
        "mastra/knowledgebase/fondazione_con_il_sud/website_kb.md"
      ),
    },
  ],
};




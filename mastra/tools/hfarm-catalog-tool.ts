/**
 * H-FARM Knowledge Base Catalog Tool
 *
 * Semantic search tool for querying the H-FARM knowledge base.
 * Supports multi-query searches for comprehensive information retrieval.
 *
 * Usage by agents:
 *   - Query educational content, course information, campus details
 *   - Use multiple queries for comprehensive searches
 *   - Results are ranked by semantic similarity
 */

import { createTool } from "@mastra/core/tools";
import { embed } from "ai";
import { z } from "zod";
import { HFARM_CATALOG } from "../utils/catalog-config";
import { embeddingModel } from "../vectors/embedder";
import { pgVector } from "../vectors/pgvector";

/**
 * Default number of results to return per query
 */
const DEFAULT_TOP_K = 5;

/**
 * Threshold below which results are considered low-quality
 */
const LOW_SCORE_THRESHOLD = 0.6;

/**
 * Minimum number of results to consider the search successful
 */
const MIN_GOOD_RESULTS = 2;

/**
 * Schema for a single search result chunk
 */
const searchResultSchema = z.object({
  id: z.string(),
  text: z.string(),
  sourceId: z.string(),
  score: z.number(),
});

/**
 * Schema for a single query result
 */
const queryResultSchema = z.object({
  query: z.string(),
  chunks: z.array(searchResultSchema),
  count: z.number(),
});

/**
 * Output schema for the catalog tool
 */
const outputSchema = z.object({
  results: z.array(queryResultSchema),
  totalUniqueResults: z.number(),
  expansionHints: z.array(z.string()).optional(),
});

/**
 * Generate expansion hints when results are insufficient
 */
function generateExpansionHints(
  queryResults: Array<{
    query: string;
    chunks: Array<{ score: number }>;
  }>
): string[] {
  const hints: string[] = [];

  for (const result of queryResults) {
    const goodResults = result.chunks.filter(
      (c) => c.score >= LOW_SCORE_THRESHOLD
    );

    // Check if results are insufficient
    if (goodResults.length < MIN_GOOD_RESULTS) {
      const query = result.query.toLowerCase();

      // Suggest related expansions based on common patterns
      if (query.includes("corso") || query.includes("course")) {
        hints.push(`Try: "programmi formativi" or "educational programs"`);
      }
      if (query.includes("campus") || query.includes("sede")) {
        hints.push(`Try: "strutture H-FARM" or "facilities"`);
      }
      if (query.includes("iscrizione") || query.includes("enroll")) {
        hints.push(`Try: "ammissione" or "admission process"`);
      }
      if (
        query.includes("costo") ||
        query.includes("prezzo") ||
        query.includes("fee")
      ) {
        hints.push(`Try: "retta" or "tuition fees"`);
      }
    }
  }

  return [...new Set(hints)]; // Remove duplicates
}

/**
 * Count unique results across all queries
 */
function countUniqueResults(
  queryResults: Array<{ chunks: Array<{ id: string }> }>
): number {
  const uniqueIds = new Set<string>();
  for (const result of queryResults) {
    for (const chunk of result.chunks) {
      uniqueIds.add(chunk.id);
    }
  }
  return uniqueIds.size;
}

/**
 * H-FARM Knowledge Base Catalog Search Tool
 *
 * Provides semantic search over the H-FARM knowledge base.
 * Use for questions about:
 * - Educational programs and courses
 * - Campus facilities and services
 * - Admission and enrollment
 * - Student life and activities
 *
 * Supports up to 5 parallel queries for comprehensive searches.
 */
export const hfarmCatalogTool = createTool({
  id: "hfarmCatalog",
  description: `Semantic search over H-FARM knowledge base.

Use for questions about:
- Educational programs, courses, and curricula
- Campus facilities, services, and locations
- Admission process, requirements, and fees
- Student life, activities, and support services
- H-FARM history, mission, and values

MULTI-QUERY: Pass up to 5 different queries for comprehensive searches.
Example: ["corso marketing", "admission requirements", "campus facilities"]

AUTONOMOUS EXPANSION: If results are insufficient, follow expansionHints for better queries.`,

  inputSchema: z.object({
    queries: z
      .array(z.string().min(3))
      .min(1)
      .max(5)
      .describe(
        "Array of search queries (1-5 queries). Use multiple queries for comprehensive coverage."
      ),
    topK: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe("Max results per query (default: 5)"),
  }),

  outputSchema,

  execute: async ({ context }) => {
    const { queries, topK = DEFAULT_TOP_K } = context;

    // Process all queries in parallel
    const queryResults = await Promise.all(
      queries.map(async (query) => {
        // Generate embedding for this query
        const { embedding } = await embed({
          model: embeddingModel,
          value: query,
        });

        // Query pgvector for similar chunks
        const results = await pgVector.query({
          indexName: HFARM_CATALOG.indexName,
          queryVector: embedding,
          topK,
        });

        // Transform results to output format
        const chunks = results.map((result) => ({
          id: result.id ?? "",
          text: (result.metadata?.text as string) ?? "",
          sourceId: (result.metadata?.sourceId as string) ?? "unknown",
          score: result.score ?? 0,
        }));

        return {
          query,
          chunks,
          count: chunks.length,
        };
      })
    );

    // Generate expansion hints if results are insufficient
    const expansionHints = generateExpansionHints(queryResults);

    // Count unique results across all queries
    const totalUniqueResults = countUniqueResults(queryResults);

    return {
      results: queryResults,
      totalUniqueResults,
      ...(expansionHints.length > 0 ? { expansionHints } : {}),
    };
  },
});

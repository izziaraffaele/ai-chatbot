/**
 * Fondazione Catalog Tool
 *
 * Semantic search tool for querying the Fondazione CON IL SUD knowledge base.
 * Uses pgvector for cosine similarity search over embedded chunks from:
 * - Chairos manual (procedures, forms, guidelines)
 * - Website KB (mission, governance, projects, contacts)
 *
 * This tool is used by the sfc_asse agent to answer questions about
 * the Foundation that require searching the knowledge base.
 *
 * Features:
 * - Supports multiple queries in a single call for comprehensive searches
 * - Returns expansion hints when results are insufficient
 * - Enables autonomous multi-call behavior for result refinement
 */

import { createTool } from "@mastra/core/tools";
import { embed } from "ai";
import { z } from "zod";
import { FONDAZIONE_CATALOG } from "../utils/catalog-config";
import { embeddingModel } from "../vectors/embedder";
import { pgVector } from "../vectors/pgvector";

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

export type FondazioneCatalogOutput = z.infer<typeof outputSchema>;
export type FondazioneCatalogTool = typeof fondazioneCatalogTool;

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
 * Generate expansion hints based on query results
 *
 * Returns suggestions for follow-up queries when:
 * - Results have low relevance scores
 * - Too few results returned
 * - Query could benefit from alternative phrasings
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
      // Suggest related expansions based on common patterns
      const query = result.query.toLowerCase();

      if (query.includes("procedur") || query.includes("come")) {
        hints.push(
          `Prova con: "guida operativa ${query.replace(/procedur\w*|come/gi, "").trim()}"`
        );
      }

      if (query.includes("requisit") || query.includes("chi può")) {
        hints.push(
          `Prova con: "criteri partecipazione ${query.replace(/requisit\w*|chi può/gi, "").trim()}"`
        );
      }

      if (query.includes("scadenz") || query.includes("quando")) {
        hints.push(
          `Prova con: "termini presentazione ${query.replace(/scadenz\w*|quando/gi, "").trim()}"`
        );
      }

      // Generic suggestion for low results
      if (hints.length === 0) {
        hints.push(
          `Risultati insufficienti per "${result.query}". Prova query più specifiche o sinonimi.`
        );
      }
    }

    // Check for low average score across all results
    if (result.chunks.length > 0) {
      const avgScore =
        result.chunks.reduce((sum, c) => sum + c.score, 0) /
        result.chunks.length;
      if (avgScore < LOW_SCORE_THRESHOLD && hints.length === 0) {
        hints.push(
          `Rilevanza bassa per "${result.query}". Considera di riformulare o espandere la ricerca.`
        );
      }
    }
  }

  return hints;
}

/**
 * Deduplicate results across multiple queries
 * Returns unique chunks based on ID
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
 * Fondazione Catalog Tool
 *
 * Performs semantic search over the Fondazione CON IL SUD knowledge base.
 * Supports multiple queries in a single call for comprehensive searches.
 *
 * Usage:
 * - Call with one or more natural language queries
 * - Returns top-k most relevant chunks per query with metadata
 * - Provides expansion hints when results are insufficient
 *
 * The agent should:
 * - Use multiple queries for complex questions spanning different topics
 * - Call autonomously again if expansionHints suggest improvements
 * - Not wait for user interaction between refinement calls
 */
export const fondazioneCatalogTool = createTool({
  id: "fondazioneCatalog",
  description: `Ricerca semantica nella knowledge base di Fondazione CON IL SUD.
Usa questo strumento per rispondere a domande su:
- Missione, governance e aree di intervento della Fondazione
- Procedure operative dal manuale Chairos
- Informazioni su progetti, contatti e organi direttivi

FUNZIONALITÀ MULTI-QUERY:
- Puoi passare fino a 5 query diverse in una singola chiamata
- Usa query multiple per domande complesse (es: requisiti + scadenze + documentazione)
- I risultati sono raggruppati per query

ESPANSIONE AUTONOMA:
- Se i risultati sono insufficienti, il tool restituisce "expansionHints"
- Segui i suggerimenti e richiama il tool SENZA attendere l'utente
- Continua a raffinare finché non hai informazioni sufficienti

IMPORTANTE: Fornisci query descrittive in italiano per ottenere risultati pertinenti.`,
  inputSchema: z.object({
    queries: z
      .array(z.string().min(3))
      .min(1)
      .max(5)
      .describe(
        "Array di query di ricerca in italiano (1-5 query). Es: ['missione fondazione', 'aree di intervento', 'governance']"
      ),
    topK: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe("Numero massimo di risultati per query (default: 5)"),
  }),
  outputSchema,
  execute: async ({ context }) => {
    const { queries, topK = DEFAULT_TOP_K } = context as {
      queries: string[];
      topK?: number;
    };

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
          indexName: FONDAZIONE_CATALOG.indexName,
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

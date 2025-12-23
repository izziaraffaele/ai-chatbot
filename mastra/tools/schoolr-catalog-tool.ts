import { createTool } from "@mastra/core";
import { embed } from "ai";
import z from "zod";
import { VECTOR_INDEX } from "@/lib/constants";
import { getDefaultEmbeddingModel } from "@/lib/vector/embeddings";
import { getDefaultVectorStore } from "@/lib/vector/store";

/**
 * Normalizes a string for keyword matching:
 * - lowercase
 * - removes accents
 * - trims whitespace
 */
function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Checks if any of the keywords match in the given text fields
 */
function matchesKeywords(
  keywords: string[],
  fields: (string | undefined)[]
): boolean {
  if (keywords.length === 0) {
    return true;
  }

  const normalizedFields = fields
    .filter(Boolean)
    .map((f) => normalizeForSearch(f as string));

  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeForSearch(keyword);
    return normalizedFields.some((field) => field.includes(normalizedKeyword));
  });
}

export const catalogSearchTool = createTool({
  id: "catalogSearch",
  description: `Search the Regione Toscana professional figures catalog for Figure Professionali, ADAs (competencies), capacità, and conoscenze.

Use KEYWORDS to filter results by specific terms (e.g., "informatica", "web", "database").
Use SETTORE to limit search to a specific professional sector.
Use FIGURA_PROFESSIONALE to find ADAs related to a specific professional figure.

Examples:
- To find all figures in IT sector: settore="informatica", collection="figure"
- To find ADAs about databases: keywords=["database", "dati"], collection="ada"
- To find everything about web development: keywords=["web", "sviluppo"], collection="all"`,
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Semantic search query in Italian. Describe what you're looking for."
      ),
    collection: z
      .enum(["figure", "ada", "all"])
      .describe(
        '"figure" = professional figures only, "ada" = competency areas only, "all" = both'
      ),
    mode: z
      .enum(["explore", "content"])
      .describe(
        '"explore" = overview with many results (max 50), "content" = detailed results (max 15)'
      ),
    keywords: z
      .array(z.string())
      .optional()
      .describe(
        "Optional keywords to filter results. Results must contain at least one keyword in name, description, or competencies."
      ),
    settore: z
      .string()
      .optional()
      .describe(
        'Optional sector filter (e.g., "informatica", "turismo alberghiero e ristorazione"). Use exact sector name from catalog.'
      ),
    figuraProfessionale: z
      .string()
      .optional()
      .describe(
        "Optional professional figure name to filter ADAs. Useful when searching for competencies of a specific role."
      ),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        type: z.enum(["figura", "ada"]),
        settore: z.string().optional(),
        denominazioneFigura: z.string().optional(),
        descrizione: z.string().optional(),
        denominazioneAda: z.string().optional(),
        uc: z.string().optional(),
        capacita: z.array(z.string()).optional(),
        conoscenze: z.array(z.string()).optional(),
        score: z.number().optional(),
      })
    ),
    totalFound: z.number().optional(),
    appliedFilters: z
      .object({
        collection: z.string().optional(),
        settore: z.string().optional(),
        figuraProfessionale: z.string().optional(),
        keywords: z.array(z.string()).optional(),
      })
      .optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { query, collection, mode, keywords, settore, figuraProfessionale } =
      context;

    // Adjust topK based on mode - fetch more to account for post-filtering
    const fetchTopK = mode === "content" ? 50 : 150;
    const returnTopK = mode === "content" ? 15 : 50;

    try {
      const store = getDefaultVectorStore();

      const { embedding } = await embed({
        value: query,
        model: getDefaultEmbeddingModel(),
      });

      // Build metadata filter for vector store query
      type FilterCondition = {
        type?: string;
        settore?: string;
        denominazioneFigura?: { $contains: string };
      };
      const filter: FilterCondition = {};

      // Filter by collection type at query level
      if (collection === "figure") {
        filter.type = "figura";
      } else if (collection === "ada") {
        filter.type = "ada";
      }

      // Filter by settore if provided
      if (settore) {
        filter.settore = settore;
      }

      // Filter by figura professionale if provided (for ADAs)
      if (figuraProfessionale) {
        filter.denominazioneFigura = { $contains: figuraProfessionale };
      }

      const results = await store.query({
        indexName: VECTOR_INDEX.figureProfessionali.catalog,
        topK: fetchTopK,
        queryVector: embedding,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
      });

      // Apply keyword filtering (post-query)
      const keywordList = keywords ?? [];
      const keywordFilteredResults = results.filter((result) => {
        if (keywordList.length === 0) {
          return true;
        }

        // Build searchable fields based on result type
        const searchFields: (string | undefined)[] = [
          result.metadata?.settore,
          result.metadata?.denominazioneFigura,
          result.metadata?.text,
        ];

        if (result.metadata?.type === "figura") {
          searchFields.push(result.metadata?.descrizione);
        } else if (result.metadata?.type === "ada") {
          searchFields.push(result.metadata?.denominazioneAda);
          // Also search in capacità and conoscenze arrays
          const capacita = result.metadata?.capacita as string[] | undefined;
          const conoscenze = result.metadata?.conoscenze as
            | string[]
            | undefined;
          if (capacita) {
            searchFields.push(...capacita);
          }
          if (conoscenze) {
            searchFields.push(...conoscenze);
          }
        }

        return matchesKeywords(keywordList, searchFields);
      });

      // Limit results
      const limitedResults = keywordFilteredResults.slice(0, returnTopK);

      // Format results
      const formattedResults = limitedResults.map((result) => ({
        type: result.metadata?.type as "figura" | "ada",
        settore: result.metadata?.settore,
        denominazioneFigura: result.metadata?.denominazioneFigura,
        ...(result.metadata?.type === "figura" && {
          descrizione:
            mode === "explore"
              ? truncateText(result.metadata?.descrizione, 200)
              : result.metadata?.descrizione,
        }),
        ...(result.metadata?.type === "ada" && {
          denominazioneAda: result.metadata?.denominazioneAda,
          uc: result.metadata?.uc,
          // In explore mode, limit arrays to first 3 items
          capacita:
            mode === "explore"
              ? (result.metadata?.capacita as string[] | undefined)?.slice(0, 3)
              : result.metadata?.capacita,
          conoscenze:
            mode === "explore"
              ? (result.metadata?.conoscenze as string[] | undefined)?.slice(
                  0,
                  3
                )
              : result.metadata?.conoscenze,
        }),
        score: result.score,
      }));

      return {
        results: formattedResults,
        totalFound: keywordFilteredResults.length,
        appliedFilters: {
          collection,
          ...(settore && { settore }),
          ...(figuraProfessionale && { figuraProfessionale }),
          ...(keywordList.length > 0 && { keywords: keywordList }),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Handle missing vector index gracefully
      if (errorMessage.includes("does not exist")) {
        return {
          results: [],
          error:
            "Il catalogo Figure Professionali non è ancora stato configurato. Esegui 'pnpm vector:setup' per popolare il catalogo.",
        };
      }

      throw error;
    }
  },
});

/**
 * Truncates text to a maximum length, adding ellipsis if truncated
 */
function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

import { createTool } from "@mastra/core";
import { createVectorQueryTool } from "@mastra/rag";
import { embed } from "ai";
import z from "zod";
import { VECTOR_INDEX } from "@/lib/constants";
import { getDefaultEmbeddingModel } from "@/lib/vector/embeddings";
import { getDefaultVectorStore } from "@/lib/vector/store";

export const schoolrCatalogQueryTool = createVectorQueryTool({
  vectorStoreName: "default",
  indexName: VECTOR_INDEX.schoolr.catalog,
  model: getDefaultEmbeddingModel(),
  description: "Use this tool to search for specific lessons from the catalog.",
  databaseConfig: {
    pgvector: {},
  },
});

export const catalogSearchTool = createTool({
  id: "catalogSearch",
  description:
    "Use this tool to explore the oragnization content catalog or search for specific content.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("The query to search for. Use italian language."),
    collection: z.enum(["lessons"]),
    mode: z
      .enum(["explore", "content"])
      .describe(
        'Use "explore" to explore the catalog, "content" to search for specific content'
      ),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        url: z.string(),
        duration: z.number().optional(),
        score: z.number().optional(),
      })
    ),
  }),
  execute: async ({ context }) => {
    const { query, mode } = context;
    const topK = mode === "content" ? 50 : 500;

    const store = getDefaultVectorStore();

    const { embedding } = await embed({
      value: query,
      model: getDefaultEmbeddingModel(),
    });

    const results = await store.query({
      indexName: VECTOR_INDEX.schoolr.catalog,
      topK,
      queryVector: embedding,
    });

    return {
      results: results.map((result) => ({
        url: result.metadata?.videoUrl,
        title: result.metadata?.title,
        ...(mode === "content" && {
          description: result.metadata?.description,
          duration: result.metadata?.duration,
          score: result.score,
        }),
      })),
    };
  },
});

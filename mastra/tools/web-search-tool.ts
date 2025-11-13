import { createTool } from "@mastra/core/tools";
import Exa from "exa-js";
import { z } from "zod";

export const webSearchTool = createTool({
  id: "webSearch",
  description: "Search the web for information",
  inputSchema: z.object({
    query: z.string().describe("The query to search the web for"),
    numResults: z
      .number()
      .default(2)
      .describe("The number of results to return"),
  }),
  execute: async ({ context }) => {
    const exa = new Exa(process.env.EXA_API_KEY || "");
    const { query, numResults } = context;
    const response = await exa.searchAndContents(query, {
      numResults,
      text: true,
      context: true,
    });
    return response;
  },
});




  
// import { createTool } from "@mastra/core/tools";
// import Exa from "exa-js";
// import { z } from "zod";

// export const webSearchTool = createTool({
//   id: "webSearch",
//   description:
//     "Search the web with Exa. Supports fast semantic search and deep research using Exa's research agent.",
//   inputSchema: z.object({
//     query: z
//       .string()
//       .describe("The query or research topic to search the web for"),
//     numResults: z
//       .number()
//       .int()
//       .min(1)
//       .max(50)
//       .default(2)
//       .describe(
//         "Number of results to return in normal search mode (ignored in deep_research mode)."
//       ),
//     mode: z
//       .enum(["search", "deep_research"])
//       .default("search")
//       .describe(
//         "Search mode. Use 'search' for quick lookups; 'deep_research' for multi-step, in-depth research with citations."
//       ),
//     instructions: z
//       .string()
//       .optional()
//       .describe(
//         "Optional natural-language instructions for deep research. Defaults to the query if omitted."
//       ),
//     outputSchema: z
//       .any()
//       .optional()
//       .describe(
//         "Optional JSON Schema for structuring deep research output. If omitted, Exa returns a markdown-style report."
//       ),
//   }),
//   // Optional, but gives you typed responses at the Mastra layer.
//   // You can tighten this later once you know exactly which Exa fields you care about.
//   // outputSchema: z.object({
//   //   mode: z.enum(["search", "deep_research"]),
//   //   query: z.string(),
//   //   result: z.unknown(),
//   //   taskId: z.string().optional(),
//   // }),

//   execute: async ({ context }) => {
//     const exaApiKey = process.env.EXA_API_KEY;
//     if (!exaApiKey) {
//       throw new Error(
//         "Missing EXA_API_KEY. Please set EXA_API_KEY in your environment."
//       );
//     }

//     const exa = new Exa(exaApiKey);

//     const {
//       query,
//       numResults,
//       mode = "search",
//       instructions,
//       outputSchema,
//     } = context;

//     // ─────────────────────────────────────────
//     // 1) NORMAL SEARCH: quick semantic web search
//     // ─────────────────────────────────────────
//     if (mode === "search") {
//       // exa.searchAndContents with `text: true` is the standard pattern to get
//       // both relevant URLs and clean text content back. :contentReference[oaicite:1]{index=1}
//       const response = await exa.searchAndContents(query, {
//         numResults,
//         text: true,
//       });

//       return {
//         mode,
//         query,
//         result: response,
//       };
//     }

//     // ─────────────────────────────────────────
//     // 2) DEEP RESEARCH: multi-step agentic research
//     //    using Exa's Research API
//     // ─────────────────────────────────────────
//     const researchInstructions = instructions ?? query;

//     const createPayload: {
//       instructions: string;
//       output?: { schema?: object };
//     } = { instructions: researchInstructions };

//     if (outputSchema) {
//       // Let the caller fully control the JSON schema Exa must satisfy
//       createPayload.output = { schema: outputSchema as object };
//     }

//     // Kick off an Exa Research task. Under the hood this will:
//     // - plan multi-step searches
//     // - issue multiple queries
//     // - read pages
//     // - synthesize a structured answer or report with citations. :contentReference[oaicite:2]{index=2}
//     const { id: taskId } = await exa.research.createTask(createPayload);

//     // Basic polling loop. You can externalize this, or make the interval configurable.
//     const maxAttempts = 20;
//     const pollIntervalMs = 3000;

//     let attempt = 0;
//     let task: any;

//     while (true) {
//       task = await exa.research.pollTask(taskId);

//       // Exa returns a status field you can use to decide when to stop polling. :contentReference[oaicite:3]{index=3}
//       if (task.status === "succeeded" || task.status === "failed") {
//         break;
//       }

//       attempt += 1;
//       if (attempt >= maxAttempts) {
//         break;
//       }

//       await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
//     }

//     return {
//       mode,
//       query,
//       taskId,
//       result: task,
//     };
//   },
// });  

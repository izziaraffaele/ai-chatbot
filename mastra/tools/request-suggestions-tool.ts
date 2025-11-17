import { createTool } from "@mastra/core/tools";
// import { streamObject } from "ai";
import { z } from "zod";
import { getDocumentById, saveSuggestions } from "@/lib/db/queries";
import type { Suggestion } from "@/lib/db/schema";
// import { generateUUID } from "@/lib/utils";
import { getSession } from "../utils/runtime-utils";

export const requestSuggestionsTool = createTool({
  id: "requestSuggestions",
  description: "Request suggestions for a document",
  inputSchema: z.object({
    documentId: z.string().describe("The ID of the document to request edits"),
  }),
  outputSchema: z.union([
    z.object({ error: z.string() }),
    z.object({
      id: z.string(),
      title: z.string(),
      kind: z.enum(["text", "code", "sheet", "image"]),
      message: z.string().optional(),
    }),
  ]),
  execute: async ({
    context,
    runtimeContext,
    // writer
  }) => {
    const { documentId } = context;
    const session = getSession(runtimeContext);

    const document = await getDocumentById({ id: documentId });

    if (!document || !document.content) {
      return {
        error: "Document not found",
      };
    }

    const suggestions: Omit<
      Suggestion,
      "userId" | "createdAt" | "documentCreatedAt"
    >[] = [];

    // const { elementStream } = streamObject({
    //   model: myProvider.languageModel("artifact-model"),
    //   system:
    //     "You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.",
    //   prompt: document.content,
    //   output: "array",
    //   schema: z.object({
    //     originalSentence: z.string().describe("The original sentence"),
    //     suggestedSentence: z.string().describe("The suggested sentence"),
    //     description: z.string().describe("The description of the suggestion"),
    //   }),
    // });

    // for await (const element of elementStream) {
    //   const suggestion: Suggestion = {
    //     originalText: element.originalSentence,
    //     suggestedText: element.suggestedSentence,
    //     description: element.description,
    //     id: generateUUID(),
    //     documentId,
    //     isResolved: false,
    //     userId: "",
    //     createdAt: new Date(),
    //     documentCreatedAt: document.createdAt,
    //   };

    //   await writer?.write({
    //     type: "data-suggestion",
    //     data: suggestion,
    //     transient: true,
    //   });

    //   suggestions.push(suggestion);
    // }

    if (session?.user?.id) {
      const userId = session.user.id;

      await saveSuggestions({
        suggestions: suggestions.map((suggestion) => ({
          ...suggestion,
          userId,
          createdAt: new Date(),
          documentCreatedAt: document.createdAt,
        })),
      });
    }

    return {
      id: documentId,
      title: document.title,
      kind: document.kind,
      message: "Suggestions have been added to the document",
    };
  },
});

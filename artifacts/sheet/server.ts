import { sheetPrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { createDocumentHandler } from "@/lib/artifacts/server";

/**
 * Sheet document handler using Mastra agents for streaming CSV/table generation.
 * Uses agent.stream() to generate spreadsheet data in real-time, emitting data-sheetDelta
 * events for each chunk received from the AI model.
 */
export const sheetDocumentHandler = createDocumentHandler<"sheet">({
  kind: "sheet",
  onCreateDocument: async ({ title, dataStream, agent }) => {
    let draftContent = "";

    if (!agent) {
      throw new Error("Agent is required for sheet document generation");
    }

    // Stream sheet generation from agent
    const stream = await agent.stream(title, { system: sheetPrompt });

    // Consume stream chunks and emit to client in real-time
    for await (const chunk of stream.textStream) {
      draftContent += chunk;

      await dataStream.custom({
        type: "data-sheetDelta",
        data: chunk,
        transient: true,
      } as any);
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, agent }) => {
    let draftContent = "";

    if (!agent) {
      throw new Error("Agent is required for sheet document update");
    }

    // Stream sheet updates from agent
    const systemPrompt = updateDocumentPrompt(document.content, "sheet");
    const stream = await agent.stream(description, {
      system: systemPrompt,
    });

    // Consume stream chunks and emit to client in real-time
    for await (const chunk of stream.textStream) {
      draftContent += chunk;

      await dataStream.custom({
        type: "data-sheetDelta",
        data: chunk,
        transient: true,
      } as any);
    }

    return draftContent;
  },
});

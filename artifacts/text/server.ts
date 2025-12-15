// import { BatchPartsProcessor } from "@mastra/core/processors";

import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { createDocumentHandler } from "@/lib/artifacts/server";

/**
 * Text document handler using Mastra agents for streaming content generation.
 * Uses agent.stream() to generate content in real-time, emitting data-textDelta
 * events for each chunk received from the AI model.
 */
export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ title, dataStream, agent }) => {
    let draftContent = "";

    if (!agent) {
      throw new Error("Agent is required for text document generation");
    }

    // Stream text generation from agent
    const stream = await agent.stream(title, {
      system:
        "Write about the given topic. Markdown is supported. Use headings wherever appropriate. Respond with the content of the document without further explanations.",
    });

    // Apply smooth streaming for more natural text delivery
    for await (const chunk of stream.textStream) {
      draftContent += chunk;

      await dataStream.custom({
        type: "data-textDelta",
        data: chunk,
        transient: true,
      } as any);
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, agent }) => {
    let draftContent = "";

    if (!agent) {
      throw new Error("Agent is required for text document update");
    }

    // Stream text updates from agent
    const systemPrompt = updateDocumentPrompt(document.content, "text");
    const stream = await agent.stream(description, {
      system: systemPrompt,
    });

    // Apply smooth streaming for more natural text delivery
    for await (const chunk of stream.textStream) {
      draftContent += chunk;

      await dataStream.custom({
        type: "data-textDelta",
        data: chunk,
        transient: true,
      } as any);
    }

    return draftContent;
  },
});

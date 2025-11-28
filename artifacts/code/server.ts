import { codePrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { createDocumentHandler } from "@/lib/artifacts/server";

/**
 * Code document handler using Mastra agents for streaming code generation.
 * Uses agent.stream() to generate code in real-time, emitting data-codeDelta
 * events for each chunk received from the AI model.
 */
export const codeDocumentHandler = createDocumentHandler<"code">({
  kind: "code",
  onCreateDocument: async ({ title, dataStream, agent }) => {
    let draftContent = "";

    if (!agent) {
      throw new Error("Agent is required for code document generation");
    }

    // Stream code generation from agent
    const stream = await agent.stream(title, { system: codePrompt });

    // Consume stream chunks and emit to client in real-time
    for await (const chunk of stream.textStream) {
      draftContent += chunk;

      await dataStream.custom({
        type: "data-codeDelta",
        data: chunk,
        transient: true,
      } as any);
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream, agent }) => {
    let draftContent = "";

    if (!agent) {
      throw new Error("Agent is required for code document update");
    }

    // Stream code updates from agent
    const systemPrompt = updateDocumentPrompt(document.content, "code");
    const stream = await agent.stream(description, {
      system: systemPrompt,
    });

    // Consume stream chunks and emit to client in real-time
    for await (const chunk of stream.textStream) {
      draftContent += chunk;

      await dataStream.custom({
        type: "data-codeDelta",
        data: chunk,
        transient: true,
      } as any);
    }

    return draftContent;
  },
});

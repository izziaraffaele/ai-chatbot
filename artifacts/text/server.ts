import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { createDocumentHandler } from "@/lib/artifacts/server";

/**
 * Text document handler using Mastra agents for streaming content generation.
 * Uses agent.stream() to generate content in real-time, emitting data-textDelta
 * events for each chunk received from the AI model.
 *
 * Note: Template-based documents (like "Documento di Liquidazione") are now
 * handled by the main agent, which passes the filled content directly to
 * createDocument. This handler is used for generic document generation.
 */
export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ title, dataStream, agent }) => {
    let draftContent = "";

    console.log(`[TextHandler] Creating document: title="${title}"`);

    if (!agent) {
      throw new Error("Agent is required for text document generation");
    }

    // Generic document generation - the agent generates content based on the title
    const systemPrompt =
      "Write about the given topic in Italian. Markdown is supported. Use headings wherever appropriate. Output ONLY the document content - no introductory or closing remarks.";
    const prompt = title;

    console.log("[TextHandler] Generic AI generation");

    // Stream text generation from agent
    const stream = await agent.stream(prompt, {
      system: systemPrompt,
    });

    // Consume stream chunks and emit to client in real-time
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

    // Consume stream chunks and emit to client in real-time
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

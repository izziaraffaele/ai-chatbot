import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { createDocumentHandler } from "@/lib/artifacts/server";
import {
  renderTemplate,
  type TemplateContext,
  templateRegistry,
} from "@/lib/templates";
// Import liquidation template to ensure it's registered
import "@/lib/templates/liquidation-communication";

/**
 * Text document handler using Mastra agents for streaming content generation.
 * Uses agent.stream() to generate content in real-time, emitting data-textDelta
 * events for each chunk received from the AI model.
 *
 * Template Support:
 * When an invoice is loaded in the runtime context and a matching template
 * is found for the document title, the template is rendered with invoice data
 * instead of using AI generation. This provides consistent, structured output
 * for standard administrative documents like "Comunicazione di Liquidazione".
 */
export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ title, dataStream, agent, invoiceContext }) => {
    let draftContent = "";

    // Debug logging
    console.log(
      `[TextHandler] Creating document: title="${title}", hasInvoiceContext=${Boolean(invoiceContext)}`
    );
    console.log(
      `[TextHandler] Registered templates: ${templateRegistry
        .getAll()
        .map((t) => t.id)
        .join(", ")}`
    );

    // Check if we have an invoice context and a matching template
    if (invoiceContext) {
      const templateContext: TemplateContext = {
        metadata: invoiceContext.metadata,
        validation: invoiceContext.validation,
        content: invoiceContext.content,
      };

      // Find a matching template for this title
      const template = templateRegistry.findTemplate(
        title,
        templateContext,
        "text"
      );

      console.log(
        `[TextHandler] Template search result: ${template ? template.id : "no match"}`
      );

      if (template) {
        // Render the template with invoice data
        const result = renderTemplate(template, templateContext);
        draftContent = result.content;

        // Log template usage for debugging
        console.log(
          `[Template] Using template "${template.id}" for document "${title}"`
        );
        if (result.missingVariables.length > 0) {
          console.log(
            `[Template] Missing variables: ${result.missingVariables.join(", ")}`
          );
        }

        // Stream the rendered content to the client
        // Send in chunks to simulate streaming for better UX
        const chunkSize = 50;
        for (let i = 0; i < draftContent.length; i += chunkSize) {
          const chunk = draftContent.slice(i, i + chunkSize);

          await dataStream.custom({
            type: "data-textDelta",
            data: chunk,
            transient: true,
          } as any);

          // Small delay between chunks for visual streaming effect
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        return draftContent;
      }
    } else {
      console.log(
        "[TextHandler] No invoice context - falling back to AI generation"
      );
    }

    // Fall back to AI generation if no template matched
    console.log("[TextHandler] Using AI generation (no template matched)");
    if (!agent) {
      throw new Error("Agent is required for text document generation");
    }

    // Stream text generation from agent
    const stream = await agent.stream(title, {
      system:
        "Write about the given topic. Markdown is supported. Use headings wherever appropriate.",
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

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import { generateUUID } from "@/lib/utils";
import { loadRecord } from "../utils/knowledge-base-loader";
import {
  getLoadedInvoice,
  getSelectedInvoiceRecordId,
  getSession,
} from "../utils/runtime-utils";

/**
 * Keywords that suggest the document requires invoice data for template generation.
 * If these appear in the title and no invoice context is available, a warning is returned.
 */
const TEMPLATE_KEYWORDS = [
  "liquidazione",
  "determina",
  "fattura",
  "invoice",
];

/**
 * Check if a title suggests a template document that requires invoice data.
 */
function titleSuggestsTemplateDocument(title: string): boolean {
  const normalizedTitle = title.toLowerCase();
  return TEMPLATE_KEYWORDS.some((keyword) => normalizedTitle.includes(keyword));
}

export const createDocumentTool = createTool({
  id: "createDocument",
  description:
    "Create a document for writing or content creation. For template documents like 'Documento di Liquidazione', you MUST provide both the filled content AND the invoiceFileId.",
  inputSchema: z.object({
    title: z.string(),
    kind: z.enum(artifactKinds),
    content: z
      .string()
      .optional()
      .describe(
        "The document content to display. For template documents (like Documento di Liquidazione), provide the filled template content directly. If not provided, the system will generate content based on the title."
      ),
    invoiceFileId: z
      .string()
      .optional()
      .describe(
        "The file ID of the invoice associated with this document. Required for liquidation documents."
      ),
  }),
  outputSchema: z.object({
    id: z.string(),
    title: z.string(),
    kind: z.enum(artifactKinds),
    content: z.string(),
    warning: z.string().optional(),
  }),
  execute: async ({ context, runtimeContext, writer }) => {
    const { title, kind, content: providedContent, invoiceFileId } = context;
    const session = getSession(runtimeContext);
    const id = generateUUID();

    // Emit initial metadata events
    await writer?.custom({
      type: "data-kind",
      data: kind,
      transient: true,
    } as any);

    await writer?.custom({
      type: "data-id",
      data: id,
      transient: true,
    } as any);

    await writer?.custom({
      type: "data-title",
      data: title,
      transient: true,
    } as any);

    await writer?.write({
      type: "data-clear",
      data: null,
      transient: true,
    } as any);

    // Use try/finally to ensure data-finish is always emitted
    try {
      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      // Get invoice context from multiple sources (in priority order):
      // 1. Explicit invoiceFileId parameter from agent
      // 2. selectedInvoiceRecordId from UI selection
      // 3. Previously loaded invoice from loadInvoice tool call
      let invoiceContext = runtimeContext
        ? getLoadedInvoice(runtimeContext)
        : undefined;
      let invoiceLoadError: string | null = null;

      // Determine which record ID to use
      const recordIdToLoad =
        invoiceFileId ||
        (runtimeContext ? getSelectedInvoiceRecordId(runtimeContext) : null);

      // If we have a record ID to load, use loadRecord (handles all sources)
      if (recordIdToLoad) {
        const source = invoiceFileId
          ? "invoiceFileId"
          : "selectedInvoiceRecordId";
        console.log(
          `[CreateDocument] Loading invoice from ${source}: ${recordIdToLoad}`
        );

        const result = await loadRecord(recordIdToLoad);
        if (result) {
          invoiceContext = {
            metadata: result.metadata,
            validation: result.validation,
            content: result.content,
          };
          console.log(
            `[CreateDocument] Invoice loaded: ${result.metadata.supplier}, amount=${result.metadata.totalAmount}`
          );
        } else {
          invoiceLoadError = `Invoice not found: ${recordIdToLoad}`;
          console.log(`[CreateDocument] Warning: ${invoiceLoadError}`);
        }
      }

    console.log(
      `[CreateDocument] title="${title}", kind="${kind}", hasProvidedContent=${Boolean(providedContent)}, hasInvoiceContext=${Boolean(invoiceContext)}, loadError=${invoiceLoadError}`
    );

      // If content is provided directly by the agent, stream it to the canvas
      if (providedContent && writer) {
        console.log(
          `[CreateDocument] Using provided content (${providedContent.length} chars)`
        );

        // Stream the content in chunks to simulate streaming
        const chunkSize = 100;
        for (let i = 0; i < providedContent.length; i += chunkSize) {
          const chunk = providedContent.slice(i, i + chunkSize);
          await writer.custom({
            type: "data-textDelta",
            data: chunk,
            transient: true,
          } as any);
        }
      } else if (writer && session) {
        // No content provided - use document handler to generate
        await documentHandler.onCreateDocument({
          id,
          title,
          dataStream: writer,
          session,
          invoiceContext,
        });
      }

      // Determine if we should warn about missing invoice context
      let warning: string | undefined;
      if (invoiceLoadError) {
        warning = `Failed to load invoice: ${invoiceLoadError}. The document was created but may have placeholder values.`;
      } else if (
        !providedContent &&
        !invoiceContext &&
        titleSuggestsTemplateDocument(title)
      ) {
        warning =
          "No invoice was selected or loaded. The document was created but uses placeholder values instead of invoice data. To use a template with real data, ensure an invoice is selected in the UI or provide the invoiceFileId parameter.";
      }

      return {
        id,
        title,
        kind,
        content: providedContent
          ? "A document was created with the provided content and is now visible to the user."
          : warning
            ? `A document was created but with warnings: ${warning}`
            : "A document was created and is now visible to the user.",
        warning,
      };
    } finally {
      // Always emit data-finish to ensure the tab transitions to idle state
      await writer?.custom({
        type: "data-finish",
        data: null,
        transient: true,
      } as any);
    }
  },
});

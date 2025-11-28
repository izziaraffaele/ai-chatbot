import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import { generateUUID } from "@/lib/utils";
import {
  loadKnowledgeBaseFile,
  validateInvoice,
} from "../utils/knowledge-base-loader";
import { getLoadedInvoice, getSession } from "../utils/runtime-utils";

export const createDocumentTool = createTool({
  id: "createDocument",
  description:
    "Create a document for writing or content creation. When creating a document about an invoice (like a Comunicazione di Liquidazione), you MUST provide the invoiceFileId parameter to use the template system.",
  inputSchema: z.object({
    title: z.string(),
    kind: z.enum(artifactKinds),
    invoiceFileId: z
      .string()
      .optional()
      .describe(
        "The file ID of the invoice to use for template-based document generation. Required for liquidation documents and any document that references a specific invoice."
      ),
  }),
  outputSchema: z.object({
    id: z.string(),
    title: z.string(),
    kind: z.enum(artifactKinds),
    content: z.string(),
  }),
  execute: async ({ context, runtimeContext, writer }) => {
    const { title, kind, invoiceFileId } = context;
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

      if (writer && session) {
        // Get invoice context - prefer explicit invoiceFileId, fall back to runtime context
        let invoiceContext = runtimeContext
          ? getLoadedInvoice(runtimeContext)
          : undefined;

        // If invoiceFileId is provided, load the invoice directly
        if (invoiceFileId) {
          console.log(
            `[CreateDocument] Loading invoice from fileId: ${invoiceFileId}`
          );
          const invoice = loadKnowledgeBaseFile(invoiceFileId);
          if (invoice) {
            const validation = validateInvoice(invoice.content);
            invoiceContext = {
              metadata: invoice.metadata,
              validation,
              content: invoice.content,
            };
            console.log(
              `[CreateDocument] Invoice loaded: ${invoice.metadata.supplier}, amount=${invoice.metadata.totalAmount}`
            );
          } else {
            console.log(
              `[CreateDocument] Warning: Invoice not found for fileId: ${invoiceFileId}`
            );
          }
        }

        console.log(
          `[CreateDocument] title="${title}", kind="${kind}", hasInvoiceContext=${Boolean(invoiceContext)}`
        );

        await documentHandler.onCreateDocument({
          id,
          title,
          dataStream: writer,
          session,
          invoiceContext,
        });
      }

      return {
        id,
        title,
        kind,
        content: "A document was created and is now visible to the user.",
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

/**
 * Invoice API Route
 *
 * Provides direct access to invoice data from the knowledge base.
 * Used by the document selector panel to fetch invoice details.
 */

import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import {
  loadKnowledgeBaseFile,
  VALIDATION_FIELD_NAMES,
  validateInvoice,
} from "@/mastra/utils/knowledge-base-loader";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter fileId is required"
    ).toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  // Load the invoice from knowledge base
  const invoice = loadKnowledgeBaseFile(fileId);

  if (!invoice) {
    return new ChatSDKError(
      "not_found:document",
      `No invoice found matching "${fileId}"`
    ).toResponse();
  }

  // Validate the invoice
  const validation = validateInvoice(invoice.content);

  // Return invoice data with validation
  return Response.json(
    {
      success: true,
      metadata: invoice.metadata,
      content: invoice.content,
      validation: {
        ...validation,
        // Convert field keys to human-readable Italian names
        campiMancanti: validation.campiMancanti.map(
          (field) => VALIDATION_FIELD_NAMES[field] || field
        ),
        campiNonValidi: validation.campiNonValidi.map(
          (field) => VALIDATION_FIELD_NAMES[field] || field
        ),
      },
    },
    { status: 200 }
  );
}

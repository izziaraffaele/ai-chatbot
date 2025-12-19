/**
 * Invoice API Route
 *
 * Provides direct access to invoice data from the knowledge base.
 * Supports both local XML files and Oracle database as data sources.
 * Used by the document selector panel to fetch invoice details.
 */

import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import {
  getDataSource,
  loadRecord,
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

  const dataSource = getDataSource();
  console.log(`[Invoice API] Using data source: ${dataSource}`);

  try {
    // Load the record using the unified function
    const record = await loadRecord(fileId);

    if (!record) {
      return new ChatSDKError(
        "not_found:document",
        `No invoice found matching "${fileId}"`
      ).toResponse();
    }

    // Return invoice data with validation
    return Response.json(
      {
        success: true,
        metadata: record.metadata,
        content: record.content,
        validation: record.validation,
        source: record.source,
        // Include impegno data if available (for Oracle source)
        impegno: record.impegno,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Invoice API] Error loading record:", error);
    return new ChatSDKError(
      "bad_request:api",
      `Error loading invoice: ${error}`
    ).toResponse();
  }
}

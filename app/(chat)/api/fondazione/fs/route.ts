/**
 * Fondazione File System API Route
 *
 * Provides HTTP access to the Fondazione bandi file system.
 * Used by the fondazione-browser canvas widget to browse and read files.
 *
 * Endpoints:
 * - GET ?action=list&path=... - List directory contents
 * - GET ?action=read&path=... - Read file content
 */

import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import {
  FondazioneFsNotFoundError,
  FondazioneFsSecurityError,
  listDirectory,
  readFileContent,
} from "@/mastra/utils/fondazione-fs-loader";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";
  const pathParam = searchParams.get("path") || "";

  // Validate action parameter
  if (action !== "list" && action !== "read") {
    return new ChatSDKError(
      "bad_request:api",
      `Azione non valida: "${action}". Usa "list" o "read".`
    ).toResponse();
  }

  // Auth check
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:document").toResponse();
  }

  try {
    if (action === "list") {
      const items = listDirectory(pathParam);

      return Response.json(
        {
          success: true,
          action: "list",
          path: pathParam,
          items,
        },
        { status: 200 }
      );
    }

    // action === "read"
    if (!pathParam) {
      return new ChatSDKError(
        "bad_request:api",
        'Per leggere un file è necessario specificare il parametro "path".'
      ).toResponse();
    }

    const result = readFileContent(pathParam);

    return Response.json(
      {
        success: true,
        action: "read",
        path: result.path,
        extension: result.extension,
        content: result.content,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle known error types
    if (error instanceof FondazioneFsSecurityError) {
      return new ChatSDKError("forbidden:document", error.message).toResponse();
    }

    if (error instanceof FondazioneFsNotFoundError) {
      return new ChatSDKError(
        "not_found:document",
        error.message
      ).toResponse();
    }

    // Unknown error - log and return generic message
    console.error("[/api/fondazione/fs] Unexpected error:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Si è verificato un errore durante l'accesso ai file."
    ).toResponse();
  }
}


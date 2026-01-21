/**
 * SMB Share Browse API
 *
 * Provides lazy loading for the SIBAC shared folder:
 * - GET /api/smb?action=browse&path=... - List folder contents
 * - GET /api/smb?action=read&path=... - Read file content
 * - GET /api/smb?action=validate&path=... - Read and validate an XML file
 * - POST /api/smb?action=sync - Sync files from SMB to local and update index
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  browseSibacPath,
  readSibacFile,
  syncSibacFiles,
  type SmbListEntry,
} from "@/lib/smb/sibac-share";
import { indexSibacChanges, type IndexResult } from "@/lib/sibac/indexer";
import { validateInvoice } from "@/mastra/utils/knowledge-base-loader";

export const dynamic = "force-dynamic";

/**
 * Validation field name mappings (Italian)
 */
const VALIDATION_FIELD_NAMES: Record<string, string> = {
  cedentePrestatore: "Cedente/Prestatore",
  cessionarioCommittente: "Cessionario/Committente",
  datiGeneraliDocumento: "Dati Generali Documento",
  datiBeniServizi: "Dati Beni/Servizi",
  datiPagamento: "Dati Pagamento",
  importoTotaleDocumento: "Importo Totale",
  dataDocumento: "Data Documento",
  numeroDocumento: "Numero Documento",
};

/**
 * Browse or read from SMB share
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action") ?? "browse";
  const path = searchParams.get("path") ?? "";

  try {
    switch (action) {
      case "browse": {
        const result = await browseSibacPath(path);

        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              error: result.error,
              entries: [],
            },
            { status: result.error?.includes("VPN") ? 503 : 500 }
          );
        }

        // Enrich entries with validation info for files
        const enrichedEntries: Array<
          SmbListEntry & {
            displayName?: string;
            fatturaValida?: boolean;
            campiMancanti?: string[];
            campiNonValidi?: string[];
          }
        > = [];

        for (const entry of result.entries) {
          if (entry.type === "folder") {
            enrichedEntries.push(entry);
          } else {
            // For files, just add them without validation (validate on demand)
            enrichedEntries.push({
              ...entry,
              displayName: entry.name,
              fatturaValida: undefined, // Not validated yet
            });
          }
        }

        return NextResponse.json({
          success: true,
          path,
          entries: enrichedEntries,
        });
      }

      case "read": {
        if (!path) {
          return NextResponse.json(
            { success: false, error: "Path required" },
            { status: 400 }
          );
        }

        const result = await readSibacFile(path);

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: result.error?.includes("VPN") ? 503 : 500 }
          );
        }

        return NextResponse.json({
          success: true,
          path,
          content: result.content,
        });
      }

      case "validate": {
        if (!path) {
          return NextResponse.json(
            { success: false, error: "Path required" },
            { status: 400 }
          );
        }

        // Only validate XML files
        if (!path.toLowerCase().endsWith(".xml")) {
          return NextResponse.json({
            success: true,
            path,
            fatturaValida: false,
            campiMancanti: ["Formato non supportato"],
            campiNonValidi: [],
          });
        }

        const result = await readSibacFile(path);

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: result.error?.includes("VPN") ? 503 : 500 }
          );
        }

        const validation = validateInvoice(result.content ?? "");

        return NextResponse.json({
          success: true,
          path,
          fatturaValida: validation.fatturaValida,
          campiMancanti: validation.campiMancanti.map(
            (field) => VALIDATION_FIELD_NAMES[field] ?? field
          ),
          campiNonValidi: validation.campiNonValidi.map(
            (field) => VALIDATION_FIELD_NAMES[field] ?? field
          ),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[SMB API] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Sync files from SMB share and update the search index
 */
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action") ?? "sync";

  if (action !== "sync") {
    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  }

  try {
    console.log("[SMB API] Starting sync...");

    // Sync files from SMB share to local directory
    const syncResult = await syncSibacFiles();

    if (!syncResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: syncResult.message,
          syncResult,
        },
        { status: syncResult.errors.some((e) => e.includes("VPN")) ? 503 : 500 }
      );
    }

    // Update the search index with changed files
    let indexResult: IndexResult | null = null;
    const hasChanges =
      syncResult.addedOrUpdatedPaths.length > 0 ||
      syncResult.removedPaths.length > 0;

    if (hasChanges) {
      console.log(
        `[SMB API] Updating index: ${syncResult.addedOrUpdatedPaths.length} added/updated, ${syncResult.removedPaths.length} removed`
      );

      indexResult = await indexSibacChanges({
        addedOrUpdatedPaths: syncResult.addedOrUpdatedPaths,
        removedPaths: syncResult.removedPaths,
      });

      console.log(
        `[SMB API] Index update complete: ${indexResult.indexed} indexed, ${indexResult.deleted} deleted, ${indexResult.errors} errors`
      );
    } else {
      console.log("[SMB API] No file changes detected, skipping index update");
    }

    return NextResponse.json({
      success: true,
      message: syncResult.message,
      syncResult: {
        filesFound: syncResult.filesFound,
        filesSynced: syncResult.filesSynced,
        addedOrUpdatedPaths: syncResult.addedOrUpdatedPaths,
        removedPaths: syncResult.removedPaths,
      },
      indexResult: indexResult
        ? {
            indexed: indexResult.indexed,
            deleted: indexResult.deleted,
            errors: indexResult.errors,
          }
        : null,
    });
  } catch (error) {
    console.error("[SMB API] Sync error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/oracle/view-schema
 *
 * Returns column metadata for the SIB_V_IMPEGNI_X_CIG view.
 * Used by the SIBAC Views Explorer widget to build the dynamic data table.
 *
 * Query params:
 * - user: Oracle user (cp_ia01 - cp_ia08), validated against allowlist
 */

import { type NextRequest, NextResponse } from "next/server";
import { discoverViewSchema, isValidOracleUser } from "@/lib/db/oracle-sibac";
import { SIBAC_VIEW_NAME, type OracleColumnInfo } from "@/lib/db/oracle-types";

// Force Node.js runtime for Oracle database access
export const runtime = "nodejs";

export type OracleViewSchemaResponse = {
  success: boolean;
  user: string;
  view: string;
  columns: OracleColumnInfo[];
  error?: string;
};

export async function GET(
  request: NextRequest
): Promise<NextResponse<OracleViewSchemaResponse>> {
  const { searchParams } = new URL(request.url);
  const user = searchParams.get("user") ?? "cp_ia01";

  // Validate user against allowlist
  if (!isValidOracleUser(user)) {
    return NextResponse.json(
      {
        success: false,
        user,
        view: SIBAC_VIEW_NAME,
        columns: [],
        error: `Utente non valido: ${user}. Utenti consentiti: cp_ia01 - cp_ia08`,
      },
      { status: 400 }
    );
  }

  try {
    const result = await discoverViewSchema(user);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          user,
          view: SIBAC_VIEW_NAME,
          columns: [],
          error: result.error ?? "Schema discovery failed",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
      view: SIBAC_VIEW_NAME,
      columns: result.columns,
    });
  } catch (error) {
    console.error("[API] /api/oracle/view-schema error:", error);

    return NextResponse.json(
      {
        success: false,
        user,
        view: SIBAC_VIEW_NAME,
        columns: [],
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

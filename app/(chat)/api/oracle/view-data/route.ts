/**
 * GET /api/oracle/view-data
 *
 * Returns paginated rows from the SIB_V_IMPEGNI_X_CIG view.
 * Used by the SIBAC Views Explorer widget for data browsing.
 *
 * Query params:
 * - user: Oracle user (cp_ia01 - cp_ia08) or "all" for aggregated view
 * - limit: Max rows to return (default: 50, max: 200)
 * - offset: Pagination offset (default: 0)
 * - cig: CIG filter (exact match, optional)
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  isValidOracleUser,
  listViewData,
  listViewDataAllUsers,
} from "@/lib/db/oracle-sibac";
import {
  SIBAC_VIEW_NAME,
  VIEW_DATA_MAX_LIMIT,
  type ViewDataResult,
} from "@/lib/db/oracle-types";

// Force Node.js runtime for Oracle database access
export const runtime = "nodejs";

export type OracleViewDataResponse = ViewDataResult;

export async function GET(
  request: NextRequest
): Promise<NextResponse<OracleViewDataResponse>> {
  const { searchParams } = new URL(request.url);

  // Parse and validate parameters
  const userParam = searchParams.get("user") ?? "cp_ia01";
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");
  const cigParam = searchParams.get("cig");

  // Parse numeric parameters
  const limit = Math.min(
    Math.max(1, Number.parseInt(limitParam ?? "50", 10) || 50),
    VIEW_DATA_MAX_LIMIT
  );
  const offset = Math.max(0, Number.parseInt(offsetParam ?? "0", 10) || 0);

  // Validate user parameter (allowlist check)
  const isAllUsers = userParam === "all";
  if (!isAllUsers && !isValidOracleUser(userParam)) {
    return NextResponse.json(
      {
        success: false,
        user: userParam as "all",
        view: SIBAC_VIEW_NAME,
        limit,
        offset,
        rows: [],
        error: `Utente non valido: ${userParam}. Utenti consentiti: cp_ia01 - cp_ia08, all`,
      },
      { status: 400 }
    );
  }

  // Build query options
  const queryOptions = {
    limit,
    offset,
    cig: cigParam ?? undefined,
  };

  try {
    let result: ViewDataResult;

    if (isAllUsers) {
      // Query all views and aggregate
      result = await listViewDataAllUsers(queryOptions);
    } else {
      // Query single user view
      result = await listViewData(userParam, queryOptions);
    }

    if (!result.success) {
      return NextResponse.json(
        {
          ...result,
          error: result.error ?? "Query failed",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] /api/oracle/view-data error:", error);

    return NextResponse.json(
      {
        success: false,
        user: isAllUsers ? "all" : userParam,
        view: SIBAC_VIEW_NAME,
        limit,
        offset,
        rows: [],
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

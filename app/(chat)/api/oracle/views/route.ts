/**
 * GET /api/oracle/views
 *
 * Returns the list of accessible Oracle views and VPN/Oracle connection status.
 * Used by the SIBAC Views Explorer widget to populate the user dropdown and status chip.
 */

import { NextResponse } from "next/server";
import { getAvailableViews } from "@/lib/db/oracle-sibac";
import {
  diagnoseOracleConnection,
  type OracleDiagnosticResult,
} from "@/lib/vpn/faenza-vpn";

// Force Node.js runtime for Oracle database access
export const runtime = "nodejs";

export type OracleViewsResponse = {
  success: boolean;
  status: OracleDiagnosticResult;
  views: ReturnType<typeof getAvailableViews>;
  error?: string;
};

export async function GET(): Promise<NextResponse<OracleViewsResponse>> {
  try {
    // Run connection diagnostics
    const status = await diagnoseOracleConnection();

    // Get list of available views (static allowlist)
    const views = getAvailableViews();

    return NextResponse.json({
      success: status.status === "ok",
      status,
      views,
    });
  } catch (error) {
    console.error("[API] /api/oracle/views error:", error);

    return NextResponse.json(
      {
        success: false,
        status: {
          vpnConnected: false,
          serverReachable: false,
          portReachable: false,
          sshTunnelEnabled: false,
          sshTunnelConnected: false,
          status: "vpn_disconnected" as const,
          message: `Errore: ${error instanceof Error ? error.message : String(error)}`,
        },
        views: [],
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * SIBAC File Search API
 *
 * Provides fast search over indexed SIBAC files without filesystem traversal.
 * NOTE: Only searches file metadata (name, path), NOT invoice content (privacy).
 *
 * GET /api/sibac/search
 *   - q: search text (uses pg_trgm ILIKE on filename and path)
 *   - ext: file extension filter (default: "all")
 *   - limit: max 200, default 50
 *   - cursor: base64 encoded { mtime, path } for pagination
 */

import { type NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sibacFileIndex } from "@/lib/db/schema";
import {
  getCachedSearchResult,
  setCachedSearchResult,
  type SearchParams,
} from "@/lib/cache/sibac-search-cache";

export const dynamic = "force-dynamic";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/** Maximum allowed limit */
const MAX_LIMIT = 200;

/** Default limit */
const DEFAULT_LIMIT = 50;

/**
 * Search result item (file metadata only, no invoice data)
 */
type SearchResultItem = {
  path: string;
  recordId: string;
  name: string;
  ext: string;
  size: number | null;
  mtime: string | null;
};

/**
 * Search response
 */
type SearchResponse = {
  items: SearchResultItem[];
  nextCursor: string | null;
};

/**
 * Cursor for pagination
 */
type PaginationCursor = {
  mtime: string | null;
  path: string;
};

/**
 * Encode cursor to base64
 */
function encodeCursor(cursor: PaginationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}

/**
 * Decode cursor from base64
 */
function decodeCursor(encoded: string): PaginationCursor | null {
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    return JSON.parse(decoded) as PaginationCursor;
  } catch {
    return null;
  }
}

/**
 * Search indexed SIBAC files
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Parse query parameters
  const q = searchParams.get("q") ?? "";
  const ext = searchParams.get("ext") ?? "all";
  const limitParam = searchParams.get("limit");
  const cursorParam = searchParams.get("cursor");

  // Parse and validate limit
  let limit = DEFAULT_LIMIT;
  if (limitParam) {
    const parsed = Number.parseInt(limitParam, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, MAX_LIMIT);
    }
  }

  // Parse cursor
  let cursor: PaginationCursor | null = null;
  if (cursorParam) {
    cursor = decodeCursor(cursorParam);
  }

  // Build cache key params
  const cacheParams: SearchParams = {
    q,
    ext,
    limit,
    cursor: cursorParam ?? undefined,
  };

  try {
    // Check cache first
    const cachedResult = await getCachedSearchResult(cacheParams);
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    // Build query conditions
    const conditions: ReturnType<typeof eq>[] = [];

    // Extension filter
    if (ext && ext !== "all") {
      conditions.push(eq(sibacFileIndex.ext, ext.toLowerCase()));
    }

    // Search text filter (uses pg_trgm for fast ILIKE on name + path)
    if (q && q.trim().length > 0) {
      const searchTerm = `%${q.trim().toLowerCase()}%`;
      conditions.push(ilike(sibacFileIndex.searchText, searchTerm));
    }

    // Cursor-based pagination (keyset pagination)
    // We use (mtime DESC, path ASC) for stable ordering
    if (cursor) {
      if (cursor.mtime) {
        // Either mtime is less than cursor.mtime, or mtime equals cursor.mtime and path > cursor.path
        conditions.push(
          or(
            lt(sibacFileIndex.mtime, new Date(cursor.mtime)),
            and(
              eq(sibacFileIndex.mtime, new Date(cursor.mtime)),
              sql`${sibacFileIndex.path} > ${cursor.path}`
            )
          )
        );
      } else {
        // For null mtime, just use path comparison
        conditions.push(sql`${sibacFileIndex.path} > ${cursor.path}`);
      }
    }

    // Execute query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        path: sibacFileIndex.path,
        name: sibacFileIndex.name,
        ext: sibacFileIndex.ext,
        size: sibacFileIndex.size,
        mtime: sibacFileIndex.mtime,
      })
      .from(sibacFileIndex)
      .where(whereClause)
      .orderBy(desc(sibacFileIndex.mtime), sibacFileIndex.path)
      .limit(limit + 1); // Fetch one extra to determine if there's a next page

    // Check if there are more results
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;

    // Build response items
    const responseItems: SearchResultItem[] = items.map((row) => ({
      path: row.path,
      recordId: `sibac-shared:${row.path}`,
      name: row.name,
      ext: row.ext,
      size: row.size,
      mtime: row.mtime?.toISOString() ?? null,
    }));

    // Build next cursor
    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items.at(-1);
      if (lastItem) {
        nextCursor = encodeCursor({
          mtime: lastItem.mtime?.toISOString() ?? null,
          path: lastItem.path,
        });
      }
    }

    const response: SearchResponse = {
      items: responseItems,
      nextCursor,
    };

    // Cache the result
    await setCachedSearchResult(cacheParams, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("[SIBAC Search] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

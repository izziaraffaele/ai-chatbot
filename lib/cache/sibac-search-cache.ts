/**
 * SIBAC Search Cache
 *
 * Provides a two-level caching layer for search results:
 * - L1: In-memory LRU cache (fast, process-local)
 * - L2: Redis cache (shared across instances)
 *
 * Cache keys include an index version to automatically invalidate
 * when the index is updated.
 */

import { createClient, type RedisClientType } from "redis";
import { getIndexVersion } from "@/lib/sibac/indexer";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Search parameters used to build cache key
 */
export type SearchParams = {
  q: string;
  ext: string;
  limit: number;
  cursor?: string;
};

/**
 * Cached search result (same as API response)
 * NOTE: Only contains file metadata, not invoice content (privacy)
 */
export type CachedSearchResult = {
  items: Array<{
    path: string;
    recordId: string;
    name: string;
    ext: string;
    size: number | null;
    mtime: string | null;
  }>;
  nextCursor: string | null;
};

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Maximum entries in L1 cache */
const L1_MAX_ENTRIES = 100;

/** L2 Redis TTL in seconds */
const L2_TTL_SECONDS = 120;

/** Redis key prefix */
const REDIS_KEY_PREFIX = "sibac:search:";

// ============================================================================
// L1 IN-MEMORY LRU CACHE
// ============================================================================

/**
 * Simple LRU cache implementation using Map
 */
class LRUCache<T> {
  private readonly cache: Map<string, T>;
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: T): void {
    // Delete first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest entry (first in Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// L1 cache instance
const l1Cache = new LRUCache<CachedSearchResult>(L1_MAX_ENTRIES);

// ============================================================================
// L2 REDIS CACHE
// ============================================================================

/** Redis client singleton */
let redisClient: RedisClientType | null = null;

/** Track if we've already logged Redis unavailability */
let redisUnavailableLogged = false;

/**
 * Get or create Redis client
 */
async function getRedisClient(): Promise<RedisClientType | null> {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    if (!redisUnavailableLogged) {
      console.log("[SIBAC Cache] Redis URL not configured, using L1 only");
      redisUnavailableLogged = true;
    }
    return null;
  }

  try {
    redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (err) => {
      console.error("[SIBAC Cache] Redis error:", err);
    });
    await redisClient.connect();
    console.log("[SIBAC Cache] Redis connected");
    return redisClient;
  } catch (error) {
    console.error("[SIBAC Cache] Failed to connect to Redis:", error);
    redisClient = null;
    return null;
  }
}

// ============================================================================
// CACHE KEY GENERATION
// ============================================================================

/**
 * Generate a stable hash for search parameters
 */
function hashParams(params: SearchParams): string {
  // Create a stable string representation
  const parts = [
    `q=${params.q}`,
    `ext=${params.ext}`,
    `limit=${params.limit}`,
    `cursor=${params.cursor ?? ""}`,
  ];
  return parts.join("|");
}

/**
 * Build cache key including index version
 */
async function buildCacheKey(params: SearchParams): Promise<string> {
  const version = await getIndexVersion();
  const hash = hashParams(params);
  return `${REDIS_KEY_PREFIX}v${version}:${hash}`;
}

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Get cached search result
 *
 * Checks L1 first, then L2 (Redis)
 *
 * @param params - Search parameters
 * @returns Cached result or null if not found
 */
export async function getCachedSearchResult(
  params: SearchParams
): Promise<CachedSearchResult | null> {
  try {
    const cacheKey = await buildCacheKey(params);

    // Check L1 cache
    const l1Result = l1Cache.get(cacheKey);
    if (l1Result) {
      return l1Result;
    }

    // Check L2 cache (Redis)
    const redis = await getRedisClient();
    if (redis) {
      const l2Result = await redis.get(cacheKey);
      if (l2Result) {
        const parsed = JSON.parse(l2Result) as CachedSearchResult;
        // Populate L1 cache
        l1Cache.set(cacheKey, parsed);
        return parsed;
      }
    }

    return null;
  } catch (error) {
    console.error("[SIBAC Cache] Get error:", error);
    return null;
  }
}

/**
 * Set cached search result
 *
 * Stores in both L1 and L2 (Redis)
 *
 * @param params - Search parameters
 * @param result - Search result to cache
 */
export async function setCachedSearchResult(
  params: SearchParams,
  result: CachedSearchResult
): Promise<void> {
  try {
    const cacheKey = await buildCacheKey(params);

    // Store in L1 cache
    l1Cache.set(cacheKey, result);

    // Store in L2 cache (Redis)
    const redis = await getRedisClient();
    if (redis) {
      await redis.setEx(cacheKey, L2_TTL_SECONDS, JSON.stringify(result));
    }
  } catch (error) {
    console.error("[SIBAC Cache] Set error:", error);
  }
}

/**
 * Clear L1 cache (useful for testing)
 */
export function clearL1Cache(): void {
  l1Cache.clear();
}

/**
 * Get L1 cache stats
 */
export function getL1CacheStats(): { size: number; maxSize: number } {
  return {
    size: l1Cache.size,
    maxSize: L1_MAX_ENTRIES,
  };
}

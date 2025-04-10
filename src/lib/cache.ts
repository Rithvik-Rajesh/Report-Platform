import { redis } from "./redis";

/**
 * Generate a standardized cache key from parts
 * @param parts - Array of strings to join into a cache key
 * @returns Formatted cache key
 */
export function generateCacheKey(parts: string[]): string {
    return parts.join(":");
}

/**
 * Get data from cache if available, otherwise fetch it and store in cache
 * @param key - Cache key
 * @param fetchFn - Function to fetch data if not in cache
 * @param ttl - Time to live in seconds (default: 3600)
 * @returns Cached or freshly fetched data
 */
export async function getCachedData<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 3600,
): Promise<T> {
    try {
        // Try to get data from cache first
        const cached = await redis.get(key);

        if (cached) {
            return JSON.parse(cached);
        }

        // If not in cache, fetch fresh data
        const data = await fetchFn();

        // Store in cache if data is not null/undefined
        if (data !== null && data !== undefined) {
            await redis.setex(key, ttl, JSON.stringify(data));
        }

        return data;
    } catch (error) {
        console.error(`Cache error for key ${key}:`, error);
        // On cache error, fall back to direct fetch
        return fetchFn();
    }
}

/**
 * Invalidate specific cache entries
 * @param key - Exact cache key or pattern with wildcard (*)
 */
export async function invalidateCache(key: string): Promise<void> {
    try {
        if (key.includes("*")) {
            // If key contains wildcard, scan and delete matching keys
            let cursor = "0";
            do {
                const [nextCursor, keys] = await redis.scan(
                    cursor,
                    "MATCH",
                    key,
                    "COUNT",
                    100,
                );
                cursor = nextCursor;

                if (keys.length > 0) {
                    await redis.del(...keys);
                }
            } while (cursor !== "0");
        } else {
            // Simple delete for exact key
            await redis.del(key);
        }
    } catch (error) {
        console.error(`Error invalidating cache for ${key}:`, error);
    }
}

/**
 * Cache middleware for API routes
 * @param handler - Next.js API route handler
 * @param options - Caching options
 * @returns Wrapped handler with caching
 */
export function withCache(
    handler: Function,
    options: {
        ttl: number;
        keyFn: (req: Request, params?: any) => string[];
    },
) {
    return async function cachedHandler(request: Request, context: any) {
        // Generate cache key
        const keyParts = options.keyFn(request, context?.params);
        const cacheKey = generateCacheKey(keyParts);

        return getCachedData(
            cacheKey,
            () => handler(request, context),
            options.ttl,
        );
    };
}

/**
 * Batch invalidate multiple cache patterns
 * @param patterns - Array of cache key patterns to invalidate
 */
export async function batchInvalidateCache(patterns: string[]): Promise<void> {
    try {
        await Promise.all(patterns.map((pattern) => invalidateCache(pattern)));
    } catch (error) {
        console.error("Batch cache invalidation error:", error);
    }
}

/**
 * Simple in-memory rate limiter.
 * Uses a Map of userId -> timestamps to track request rates.
 * Automatically cleans up expired entries.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Creates a rate limiter for a specific endpoint.
 * @param name - Unique name for this limiter (e.g., "enhanced-test")
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function createRateLimiter(
  name: string,
  maxRequests: number,
  windowMs: number
) {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  const store = stores.get(name)!;

  return {
    /**
     * Check if a request is allowed for the given key.
     * @param key - Unique identifier (e.g., userId)
     * @returns { allowed: boolean, remaining: number, retryAfterMs: number | null }
     */
    check(key: string): {
      allowed: boolean;
      remaining: number;
      retryAfterMs: number | null;
    } {
      const now = Date.now();
      let entry = store.get(key);

      if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
      }

      // Remove expired timestamps
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

      if (entry.timestamps.length >= maxRequests) {
        const oldestInWindow = entry.timestamps[0];
        const retryAfterMs = windowMs - (now - oldestInWindow);
        return { allowed: false, remaining: 0, retryAfterMs };
      }

      entry.timestamps.push(now);
      const remaining = maxRequests - entry.timestamps.length;
      return { allowed: true, remaining, retryAfterMs: null };
    },
  };
}

// Periodic cleanup of stale entries (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [, store] of stores) {
      for (const [key, entry] of store) {
        // Remove entries with no recent timestamps (older than 5 minutes)
        entry.timestamps = entry.timestamps.filter(
          (t) => now - t < 5 * 60 * 1000
        );
        if (entry.timestamps.length === 0) {
          store.delete(key);
        }
      }
    }
  }, 5 * 60 * 1000);
}

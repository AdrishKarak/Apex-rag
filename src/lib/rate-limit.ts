/**
 * @file src/lib/rate-limit.ts
 * @description Sliding-window in-memory rate limiter to restrict API usage and protect LLM token credits.
 * 
 * WHY IT'S NEEDED:
 * Limits API queries/mutations to prevent spam, denial-of-service, or cost runaway of external LLMs.
 * 
 * FLOW OF EXECUTION:
 * 1. `check(key, limit, windowMs)`: Receives key (e.g. user_id + router path).
 * 2. Purges historical hits that are outside the sliding window (`now - windowMs`).
 * 3. Compares the size of the remaining records with the allowed `limit`.
 * 4. If limit is exceeded, return success: false, and calculate the reset millisecond timeline.
 * 5. If allowed, appends the current timestamp to the record and returns success: true.
 * 6. Periodic cleanup runs once a minute via `maybeCleanup` to delete stale records (older than 5 minutes).
 * 
 * CONNECTIONS:
 * - Employed inside tRPC middleware `rateLimitMiddleware` in `src/server/api/trpc.ts`.
 */

type RateLimitRecord = {
  timestamps: number[]; // Arrays of UNIX timestamp hits for the given key
};

class RateLimiter {
  // Map recording rate hits by key
  private hits = new Map<string, RateLimitRecord>();
  // Periodic cleanup interval setting (default 1 minute)
  private cleanupIntervalMs = 60 * 1000;
  // Last execution time of the garbage collector routine
  private lastCleanup = Date.now();

  /**
   * Check rate limit status for a specific target key.
   * @param key Unique identifier (e.g. `user_123:project.askQuestion`)
   * @param limit Maximum allowed hits within the sliding window
   * @param windowMs Time window duration in milliseconds (default 1 minute)
   */
  public check(
    key: string,
    limit: number = 100,
    windowMs: number = 60 * 1000
  ): { success: boolean; limit: number; remaining: number; resetMs: number } {
    const now = Date.now();
    // Periodically prune stale references
    this.maybeCleanup(now);

    const record = this.hits.get(key) ?? { timestamps: [] };
    
    // Evict timestamps that fall outside the current sliding window boundary
    const windowStart = now - windowMs;
    const validTimestamps = record.timestamps.filter((ts) => ts > windowStart);

    // If hits in window exceed the threshold limit, block further execution
    if (validTimestamps.length >= limit) {
      const oldestInWindow = validTimestamps[0] ?? now;
      const resetMs = oldestInWindow + windowMs - now;
      return {
        success: false,
        limit,
        remaining: 0,
        resetMs: Math.max(0, resetMs), // Time remaining until the oldest hit slides out of the window
      };
    }

    // Append the current request timestamp and save back to the map
    validTimestamps.push(now);
    this.hits.set(key, { timestamps: validTimestamps });

    return {
      success: true,
      limit,
      remaining: limit - validTimestamps.length,
      resetMs: windowMs,
    };
  }

  /**
   * Garbages collection routine to prevent slow memory exhaustion.
   * @param now Current UNIX timestamp
   */
  private maybeCleanup(now: number) {
    // Only execute if at least 1 minute has elapsed since the last run
    if (now - this.lastCleanup < this.cleanupIntervalMs) {
      return;
    }
    this.lastCleanup = now;

    // Prune entries that have been inactive for over 5 minutes
    const staleThreshold = now - 5 * 60 * 1000;
    for (const [key, record] of this.hits.entries()) {
      const active = record.timestamps.filter((ts) => ts > staleThreshold);
      if (active.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, { timestamps: active });
      }
    }
  }
}

// Export singleton instance of the RateLimiter class
export const rateLimiter = new RateLimiter();


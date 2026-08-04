/**
 * Sliding-window in-memory rate limiter utility.
 */

type RateLimitRecord = {
  timestamps: number[];
};

class RateLimiter {
  private hits = new Map<string, RateLimitRecord>();
  private cleanupIntervalMs = 60 * 1000;
  private lastCleanup = Date.now();

  /**
   * Check rate limit for a specific key (userId or IP + action).
   * @param key Unique identifier (e.g. `user_123:askQuestion` or `ip_1.2.3.4`)
   * @param limit Maximum allowed hits within window
   * @param windowMs Time window in milliseconds (default 60,000ms = 1 min)
   */
  public check(
    key: string,
    limit: number = 100,
    windowMs: number = 60 * 1000
  ): { success: boolean; limit: number; remaining: number; resetMs: number } {
    const now = Date.now();
    this.maybeCleanup(now);

    const record = this.hits.get(key) ?? { timestamps: [] };
    
    // Filter out timestamps outside current window
    const windowStart = now - windowMs;
    const validTimestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (validTimestamps.length >= limit) {
      const oldestInWindow = validTimestamps[0] ?? now;
      const resetMs = oldestInWindow + windowMs - now;
      return {
        success: false,
        limit,
        remaining: 0,
        resetMs: Math.max(0, resetMs),
      };
    }

    validTimestamps.push(now);
    this.hits.set(key, { timestamps: validTimestamps });

    return {
      success: true,
      limit,
      remaining: limit - validTimestamps.length,
      resetMs: windowMs,
    };
  }

  private maybeCleanup(now: number) {
    if (now - this.lastCleanup < this.cleanupIntervalMs) {
      return;
    }
    this.lastCleanup = now;

    // Purge empty or stale entries older than 5 minutes
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

export const rateLimiter = new RateLimiter();

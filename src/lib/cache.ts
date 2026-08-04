/**
 * @file src/lib/cache.ts
 * @description Server-side Time-to-Live (TTL) in-memory cache system equipped with prefix-based invalidation patterns.
 * 
 * WHY IT'S NEEDED:
 * To avoid repeated database lookups and reduce network delay for static/semi-static data
 * (such as project listings, team member lists, or invite code validations).
 * 
 * FLOW OF EXECUTION:
 * 1. `get(key)`: Looks up the key. If found, checks if `Date.now()` is past `expiresAt`. If expired, it deletes the key and returns null.
 * 2. `set(key, data, ttlMs)`: Stores the data payload mapped to an expiration timestamp (`now + ttlMs`).
 * 3. `invalidate(prefix)`: Scans all keys, deleting any key matching the string or starting with the prefix.
 * 
 * CONNECTIONS:
 * - Imported and used by `src/server/api/routers/project.ts` to cache projects (30s), member lists (60s), and invite codes (5m).
 * - Invalidated during mutations like `createProject`, `deleteProject`, `joinProject`, `leaveProject`, and `syncProject`.
 */

type CacheEntry<T> = {
  data: T;         // Cached data payload of generic type T
  expiresAt: number; // Unix timestamp in milliseconds when this entry expires
};

class MemoryCache {
  // Underlying Map to store the cache entries
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Retrieves a cached item if it exists and has not expired.
   * @param key Unique key identifier
   * @returns The cached payload data of type T, or null if expired/non-existent
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if the current time has surpassed the expiration timestamp
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key); // Evict expired entry from memory
      return null;
    }

    return entry.data as T;
  }

  /**
   * Sets a cache entry with a specified TTL.
   * @param key Unique key identifier
   * @param data Payload data to cache
   * @param ttlMs Time-to-live in milliseconds (defaults to 1 minute)
   */
  public set<T>(key: string, data: T, ttlMs: number = 60 * 1000): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Invalidates (deletes) an exact key or all keys starting with a specific prefix.
   * Useful for wildcards, e.g., invalidating "projects:user:123" when user 123 adds a new project.
   * @param keyOrPrefix The exact key or prefix string to match and clear
   */
  public invalidate(keyOrPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Fully clears the memory cache.
   */
  public clear(): void {
    this.cache.clear();
  }
}

// Export a single global instance of MemoryCache
export const serverCache = new MemoryCache();


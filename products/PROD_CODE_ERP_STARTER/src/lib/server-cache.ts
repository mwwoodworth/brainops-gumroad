/**
 * Server-Side API Cache
 * In-memory caching for API routes (Next.js server-side)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ServerCache {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 60000) { // 1 minute default
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get cached data if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache entry with custom or default TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance for server-side caching
export const serverCache = new ServerCache(60000);

// Auto-cleanup every 5 minutes
if (typeof global !== 'undefined') {
  setInterval(() => serverCache.clearExpired(), 5 * 60 * 1000);
}

/**
 * Cache TTL presets
 */
export const ServerCacheTTL = {
  SHORT: 30000,      // 30 seconds
  MEDIUM: 60000,     // 1 minute
  LONG: 300000,      // 5 minutes
  VERY_LONG: 900000, // 15 minutes
} as const;

/**
 * Helper to generate cache keys
 */
export function generateCacheKey(prefix: string, params: Record<string, any> = {}): string {
  const paramString = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return paramString ? `${prefix}:${paramString}` : prefix;
}

/**
 * Invalidate cache by pattern
 */
export function invalidateServerCache(pattern: string | RegExp): void {
  const keys = Array.from(serverCache.getStats().keys);

  for (const key of keys) {
    if (typeof pattern === 'string' && key.includes(pattern)) {
      serverCache.delete(key);
    } else if (pattern instanceof RegExp && pattern.test(key)) {
      serverCache.delete(key);
    }
  }
}

/**
 * API Response Caching
 * In-memory cache with TTL for API responses
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class APICache {
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
   * Clear specific cache entry
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

// Singleton instance
export const apiCache = new APICache(60000);

// Auto-cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => apiCache.clearExpired(), 5 * 60 * 1000);
}

/**
 * Cached fetch wrapper
 * Automatically caches GET requests
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  cacheTTL?: number
): Promise<T> {
  const method = options?.method || 'GET';

  // Only cache GET requests
  if (method !== 'GET') {
    const response = await fetch(url, options);
    return response.json();
  }

  // Check cache first
  const cacheKey = `${method}:${url}`;
  const cached = apiCache.get<T>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch and cache
  const response = await fetch(url, options);
  const data = await response.json();
  apiCache.set(cacheKey, data, cacheTTL);

  return data;
}

/**
 * Invalidate cache by pattern
 * Useful for clearing related caches after mutations
 */
export function invalidateCache(pattern: string | RegExp): void {
  const keys = Array.from(apiCache.getStats().keys);

  for (const key of keys) {
    if (typeof pattern === 'string' && key.includes(pattern)) {
      apiCache.delete(key);
    } else if (pattern instanceof RegExp && pattern.test(key)) {
      apiCache.delete(key);
    }
  }
}

/**
 * Cache configuration presets
 */
export const CacheTTL = {
  SHORT: 30000,      // 30 seconds
  MEDIUM: 60000,     // 1 minute
  LONG: 300000,      // 5 minutes
  VERY_LONG: 900000, // 15 minutes
} as const;

/**
 * Simple in-memory query cache for analytics data
 * Reduces redundant database queries and improves performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache entry with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const usedTTL = ttl || this.defaultTTL;
    const expiresAt = now + usedTTL;

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries matching a pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      keysToDelete.forEach((key) => {
        this.cache.delete(key);
      });
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate all cache entries for a specific company
   */
  invalidateCompany(companyId: number): void {
    this.invalidatePattern(`company:${companyId}`);
  }

  /**
   * Invalidate all cache entries for a specific period
   */
  invalidatePeriod(companyId: number, periodCode: string): void {
    this.invalidatePattern(`company:${companyId}.*period:${periodCode}`);
  }

  /**
   * Invalidate all cache entries for a specific year
   */
  invalidateYear(companyId: number, year: number): void {
    this.invalidatePattern(`company:${companyId}.*year:${year}`);
  }

  /**
   * Invalidate all sales-related cache for a company
   */
  invalidateSales(companyId: number): void {
    this.invalidatePattern(`sales.*company:${companyId}`);
  }

  /**
   * Invalidate all purchases-related cache for a company
   */
  invalidatePurchases(companyId: number): void {
    this.invalidatePattern(`purchases.*company:${companyId}`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let expired = 0;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      active: this.cache.size - expired,
      expired
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

// Singleton instance
export const queryCache = new QueryCache();

// Auto cleanup every 2 minutes
setInterval(
  () => {
    queryCache.cleanup();
  },
  2 * 60 * 1000
);

/**
 * Helper function to generate cache keys
 */
export function getCacheKey(prefix: string, params: Record<string, string | number>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${params[key]}`)
    .join('|');

  return `${prefix}|${sortedParams}`;
}

/**
 * Wrapper for cached queries
 */
export async function cachedQuery<T>(key: string, queryFn: () => Promise<T>, ttl?: number): Promise<T> {
  // Check cache first
  const cached = queryCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Execute query (cache miss)
  const result = await queryFn();
  // Store in cache
  queryCache.set(key, result, ttl);

  return result;
}

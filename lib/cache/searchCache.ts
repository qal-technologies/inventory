/**
 * Search Result Cache Manager
 * Caches search results to avoid redundant database queries
 * Implements simple debouncing and query deduplication
 */

import type { Product } from '@/lib/firebase/converters';

interface SearchCacheEntry {
  results: Product[];
  timestamp: number;
  query: string;
}

class SearchCache {
  private cache = new Map<string, SearchCacheEntry>();
  private pendingRequests = new Map<string, Promise<Product[]>>();
  private readonly TTL = 10 * 60 * 1000; // 10 minutes for search results
  private readonly MAX_CACHE_SIZE = 50; // Limit memory usage

  /**
   * Get cached search results
   */
  get(key: string): Product[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.TTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.results;
  }

  /**
   * Set search results with automatic eviction of old entries
   */
  set(key: string, results: Product[], query: string): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldest = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0];
      this.cache.delete(oldest[0]);
    }

    this.cache.set(key, {
      results,
      timestamp: Date.now(),
      query,
    });
  }

  /**
   * Deduplicate concurrent requests for the same search
   */
  getOrFetch(
    key: string,
    fetchFn: () => Promise<Product[]>
  ): Promise<Product[]> {
    // Return cached result if available
    const cached = this.get(key);
    if (cached) return Promise.resolve(cached);

    // Return pending request if already in flight
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Execute fetch and cache result
    const promise = fetchFn()
      .then((results) => {
        // Extract search query from cache for logging
        const entry = this.cache.get(key);
        this.set(key, results, entry?.query || 'unknown');
        return results;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Invalidate search cache
   */
  invalidate(): void {
    this.cache.clear();
  }

  /**
   * Clear specific cache entries by pattern
   */
  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getStats() {
    return {
      cachedQueries: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        query: entry.query,
        resultCount: entry.results.length,
        age: Date.now() - entry.timestamp,
      })),
    };
  }
}

export const searchCache = new SearchCache();

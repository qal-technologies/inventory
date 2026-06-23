/**
 * Product Cache Manager
 * Implements TTL-based caching to minimize database reads
 * Syncs with reactive updates from real-time listeners
 */

import type { Product } from '@/lib/firebase/converters';

interface CacheEntry<T> {
  data: T[];
  timestamp: number;
  etag?: string;
}

class TTLCache<T extends { id: string }> {
  private cache = new Map<string, CacheEntry<T>>();
  private TTL: number;
  private listeners = new Set<() => void>();

  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.TTL = ttlMs;
  }

  /**
   * Get cached data if valid (not expired)
   */
  get(key: string): T[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.TTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache with optional etag for conditional updates
   */
  set(key: string, data: T[], etag?: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      etag,
    });
    this.notifyListeners();
  }

  /**
   * Merge new items into cache (for pagination)
   */
  append(key: string, newItems: T[]): void {
    const existing = this.cache.get(key);
    if (!existing) {
      this.set(key, newItems);
      return;
    }

    const existingIds = new Set(existing.data.map((item) => item.id));
    const filtered = newItems.filter((item) => !existingIds.has(item.id));

    if (filtered.length > 0) {
      this.set(key, [...existing.data, ...filtered], existing.etag);
    }
  }

  /**
   * Update a single item in cache
   */
  updateItem(key: string, updatedItem: T): void {
    const entry = this.cache.get(key);
    if (!entry) return;

    const updated = entry.data.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    this.set(key, updated, entry.etag);
  }

  /**
   * Invalidate specific cache key or all cache
   */
  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
    this.notifyListeners();
  }

  /**
   * Get cache hit rate for debugging
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Subscribe to cache changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const productCache = new TTLCache<Product>(5 * 60 * 1000);

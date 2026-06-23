/**
 * Sales Cache Manager
 * Implements TTL-based caching for sales data
 */

import type { Sale } from '@/lib/firebase/converters';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SalesCache {
  private cache = new Map<string, CacheEntry<any>>();
  private TTL: number;

  constructor(ttlMs: number = 10 * 60 * 1000) {
    this.TTL = ttlMs;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.TTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

export const salesCache = new SalesCache(10 * 60 * 1000);

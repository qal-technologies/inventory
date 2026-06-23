/**
 * Unified App Cache
 * Stores all fetched collections in memory with TTL.
 * Writes should call invalidate() so the next read re-fetches fresh data.
 *
 * Design:
 *  - Admin home: fetches ALL sales + ALL products once, stores here.
 *  - All other pages: use paginated endpoints but can warm from this cache.
 *  - Cache survives component re-renders and tab switches.
 *  - Manual refresh button calls invalidateAll() then re-queries.
 */

import type { Product, Sale } from '@/lib/firebase/converters';

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

class AppCache {
  private store = new Map<string, CacheEntry<unknown>>();
  // 10 minutes default TTL for admin home data
  private defaultTTL = 10 * 60 * 1000;

  private listeners = new Set<() => void>();

  get<T>(key: string, ttlMs?: number): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    const ttl = ttlMs ?? this.defaultTTL;
    if (Date.now() - entry.fetchedAt > ttl) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, { data, fetchedAt: Date.now() });
    this._notify();
  }

  invalidate(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
    this._notify();
  }

  /** Invalidate only product-related keys so after a write the next read is fresh */
  invalidateProducts(): void {
    for (const key of this.store.keys()) {
      if (key.startsWith('products:')) this.store.delete(key);
    }
    this._notify();
  }

  /** Invalidate only sales-related keys */
  invalidateSales(): void {
    for (const key of this.store.keys()) {
      if (key.startsWith('sales:')) this.store.delete(key);
    }
    this._notify();
  }

  /** Return age in seconds for a given key, or -1 if not cached */
  ageOf(key: string): number {
    const e = this.store.get(key);
    if (!e) return -1;
    return Math.floor((Date.now() - e.fetchedAt) / 1000);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private _notify() {
    this.listeners.forEach((fn) => fn());
  }
}

export const appCache = new AppCache();

// ── Typed helpers ────────────────────────────────────────────────────────────

export const CACHE_KEYS = {
  /** ALL products (admin home) */
  ALL_PRODUCTS: 'products:all',
  /** ALL sales (admin home — not paginated) */
  ALL_SALES: 'sales:all',
  /** Branches list */
  BRANCHES: 'branches:list',
  /** Available sale months (global) */
  SALE_MONTHS: (branchId?: string) =>
    branchId ? `sale-months:${branchId}` : 'sale-months:all',
} as const;

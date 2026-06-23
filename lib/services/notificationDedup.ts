/**
 * Notification Deduplication Manager
 * Prevents duplicate alerts within a short time window (30 seconds)
 * Uses in-memory cache to avoid database reads
 * No Cloud Functions needed - triggers immediately when user is active
 */

import type { Product } from '@/lib/firebase/converters';

interface DedupEntry {
  timestamp: number;
}

class NotificationDeduplicator {
  private cache = new Map<string, DedupEntry>();
  private readonly WINDOW = 30 * 1000; // 30 second dedup window
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 60 seconds
    this.startCleanup();
  }

  /**
   * Check if we should send a notification
   * Returns true if NOT a duplicate (safe to send)
   */
  shouldNotify(branchId: string, productId: string | undefined, type: string): boolean {
    const key = `${branchId}:${productId || 'all'}:${type}`;
    const entry = this.cache.get(key);

    if (!entry) {
      // No previous notification, safe to send
      this.cache.set(key, { timestamp: Date.now() });
      return true;
    }

    const age = Date.now() - entry.timestamp;
    if (age > this.WINDOW) {
      // Old entry, safe to send
      this.cache.set(key, { timestamp: Date.now() });
      return true;
    }

    // Duplicate within window, skip
    return false;
  }

  /**
   * Manually record a notification send
   */
  recordNotification(branchId: string, productId: string | undefined, type: string): void {
    const key = `${branchId}:${productId || 'all'}:${type}`;
    this.cache.set(key, { timestamp: Date.now() });
  }

  /**
   * Clear specific notification from dedup cache
   */
  clearNotification(branchId: string, productId: string | undefined, type: string): void {
    const key = `${branchId}:${productId || 'all'}:${type}`;
    this.cache.delete(key);
  }

  /**
   * Clear all cached notifications
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let removed = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > this.WINDOW) {
          this.cache.delete(key);
          removed++;
        }
      }

      if (removed > 0) {
        console.log('[Dedup Cleanup] Removed expired entries', { count: removed });
      }
    }, 60 * 1000); // Run every 60 seconds
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get cache stats for debugging
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

export const notificationDedup = new NotificationDeduplicator();

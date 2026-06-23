'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchAllProducts } from '@/lib/services/products';
import { productCache } from '@/lib/cache/productCache';

/**
 * Hook for fetching paginated products with client-side caching
 * Implements exponential backoff and proper cache validation
 *
 * @param branchId - Optional branch filter
 * @param limitCount - Items per page
 * @param lastId - Cursor for pagination
 */
export function useProducts(
  branchId?: string,
  limitCount: number = 20,
  lastId?: string,
  useFullCache: boolean = false
) {
  const cacheKey = branchId ? `products:${branchId}` : 'products:all';

  return useQuery({
    queryKey: ['products', branchId, limitCount, lastId, useFullCache],
    queryFn: async () => {
      if (useFullCache) {
        const cached = productCache.get(cacheKey);
        if (cached) return cached;

        // If not in cache and requesting full collection, fetch a large amount
        const data = branchId
          ? await fetchProducts(branchId, 5000)
          : await fetchAllProducts(5000);

        if (data.length > 0) {
          productCache.set(cacheKey, data);
        }
        return data;
      }

      // Check client cache first (only for initial fetch, not pagination)
      if (!lastId) {
        const cached = productCache.get(cacheKey);
        if (cached) {
          console.log('[Product Cache Hit]', { branchId, cacheKey });
          return cached;
        }
      }

      // Fetch from service
      const data = branchId
        ? await fetchProducts(branchId, limitCount, lastId)
        : await fetchAllProducts(limitCount, lastId);

      // Update cache only for first page
      if (!lastId && data.length > 0) {
        productCache.set(cacheKey, data);
      }

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.status === 403) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

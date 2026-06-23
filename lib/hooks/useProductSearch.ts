'use client';
import { useQuery } from '@tanstack/react-query';
import { searchCache } from '@/lib/cache/searchCache';
import type { Product } from '@/lib/firebase/converters';

/**
 * Server-side search hook for products
 * Eliminates database reads for search queries
 * Results are cached to minimize redundant requests
 *
 * @param branchId - Filter search to specific branch
 * @param searchQuery - Search term (triggers server-side search)
 * @param enabled - Disable query if search is empty or component unmounted
 */
export function useProductSearch(
  branchId: string | undefined,
  searchQuery: string,
  enabled: boolean = true
) {
  const cacheKey = `${branchId}:${searchQuery}`;

  return useQuery({
    queryKey: ['product-search', branchId, searchQuery],
    queryFn: async () => {
      // Check cache first
      const cached = searchCache.get(cacheKey);
      if (cached) {
        console.log('[Search Cache Hit]', { branchId, searchQuery });
        return cached;
      }

      // Use deduplication to prevent duplicate in-flight requests
      return searchCache.getOrFetch(cacheKey, async () => {
        const params = new URLSearchParams();
        if (branchId) params.set('branchId', branchId);
        params.set('q', searchQuery);

        const res = await fetch(`/api/products/search?${params}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          throw new Error(
            `Search failed: ${res.status} ${res.statusText}`
          );
        }

        const data = await res.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid search response format');
        }

        return data as Product[];
      });
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // Keep in memory for 15 minutes
    enabled: enabled && searchQuery.trim().length > 0,
    retry: 1,
    retryDelay: 1000,
  });
}

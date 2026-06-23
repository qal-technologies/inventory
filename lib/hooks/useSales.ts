'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchSales } from '@/lib/services/sales';
import { salesCache } from '@/lib/cache/salesCache';

export function useSales(
  branchId?: string,
  limitCount = 20,
  lastId?: string,
  month?: string,
  useFullCache: boolean = false
) {
  const cacheKey = `sales:${branchId || 'all'}:${month || 'all'}`;

  return useQuery({
    // Use a stable key: ['sales'] for "all sales", ['sales', branchId] for filtered
    queryKey:
      branchId ? ['sales', branchId, limitCount, lastId, month, useFullCache] : ['sales', limitCount, lastId, month, useFullCache],
    queryFn: async () => {
      if (useFullCache) {
        const cached = salesCache.get(cacheKey);
        if (cached) return cached;

        const data = await fetchSales(branchId, 5000, undefined, month);
        if (data.sales.length > 0) {
          salesCache.set(cacheKey, data);
        }
        return data;
      }

      return fetchSales(branchId, limitCount, lastId, month);
    },
    staleTime: 30_000, // 30s stale time — data is fresh for 30s
  });
}

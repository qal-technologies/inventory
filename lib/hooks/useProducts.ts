'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchAllProducts } from '@/lib/services/products';

export function useProducts(branchId?: string, limitCount = 20, lastId?: string) {
  return useQuery({
    // 'admin-products' key for all-product queries (matches admin home dashboard)
    // ['products', branchId] for branch-specific queries (matches staff pages)
    queryKey:
      branchId ?
        ['products', branchId, limitCount, lastId]
      : ['admin-products', limitCount, lastId],
    queryFn: () =>
      branchId ?
        fetchProducts(branchId, limitCount, lastId)
      : fetchAllProducts(limitCount, lastId),
  });
}

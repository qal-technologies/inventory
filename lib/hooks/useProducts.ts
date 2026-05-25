'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchAllProducts } from '@/lib/services/products';

export function useProducts(branchId?: string) {
  return useQuery({
    // 'admin-products' key for all-product queries (matches admin home dashboard)
    // ['products', branchId] for branch-specific queries (matches staff pages)
    queryKey: branchId ? ['products', branchId] : ['admin-products'],
    queryFn: () => branchId ? fetchProducts(branchId) : fetchAllProducts(),
  });
}

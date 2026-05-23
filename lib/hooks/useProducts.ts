'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchAllProducts } from '@/lib/services/products';

export function useProducts(branchId?: string) {
  return useQuery({
    queryKey: ['products', branchId || 'all'],
    queryFn: () => branchId ? fetchProducts(branchId) : fetchAllProducts(),
  });
}

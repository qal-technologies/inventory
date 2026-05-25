'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchSales } from '@/lib/services/sales';

export function useSales(branchId?: string) {
  return useQuery({
    // Use a stable key: ['sales'] for "all sales", ['sales', branchId] for filtered
    queryKey: branchId ? ['sales', branchId] : ['sales'],
    queryFn: () => fetchSales(branchId),
    staleTime: 30_000, // 30s stale time — data is fresh for 30s
  });
}

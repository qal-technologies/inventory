'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchSales } from '@/lib/services/sales';

export function useSales(branchId?: string) {
  return useQuery({
    queryKey: ['sales', branchId],
    queryFn: () => fetchSales(branchId),
  });
}

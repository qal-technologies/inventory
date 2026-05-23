'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchBranches } from '@/lib/services/branches';

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });
}

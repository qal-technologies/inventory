import {
  collection,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  doc,
  getDoc,
} from 'firebase/firestore';
import type { Sale } from '@/lib/firebase/converters';
import { appCache } from '../cache/appCache';

/**
 * Fetch sales list.
 * Falls back to server-side API route if client SDK query fails (due to rules/permissions).
 */
export async function fetchSales(
  branchId?: string,
  limitCount = 20,
  lastId?: string,
  month?: string,
): Promise<{ sales: Sale[]; stats: any; hasMore: boolean }> {
  // Layer 1: API Route GET /api/sales (Skip client SDK for complex filtering/aggregation)
  try {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    if (month) params.set('month', month);
    if (limitCount) params.set('limit', limitCount.toString());
    if (lastId) params.set('lastId', lastId);

    const res = await fetch(`/api/sales?${params.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('API route sales fetch failed:', err);
  }

  // Layer 2: Final Fallback (Empty)
  console.warn('[Fallback] All data sources exhausted. Returning empty list.');
  return {
    sales: [],
    stats: { totalRevenue: 0, totalProfit: 0, totalDiscount: 0, count: 0 },
    hasMore: false,
  };
}

/**
 * Fetch ALL sales for admin home (no pagination).
 * Used ONLY for admin dashboard statistics and calculations.
 * Results are cached by the caller (admin home) for 10 minutes.
 * Bypasses paginated fetchSales to get the complete dataset.
 */
export async function fetchAdminAllSales(): Promise<Sale[]> {
  try {
    const res = await fetch('/api/sales?limit=5000'); // limit 5000 for full collection
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.sales)) {
        console.log('[Admin Cache] Fetched all sales for dashboard', {
          count: data.sales.length,
        });
        return data.sales;
      }
    }
  } catch (err) {
    console.error('[Admin Cache Error] Failed to fetch all sales:', err);
  }

  return [];
}

/**
 * Fetch months that have sales records.
 */
export async function fetchSaleMonths(branchId?: string): Promise<string[]> {
  try {
    const url =
      branchId ? `/api/sales/months?branchId=${branchId}` : '/api/sales/months';
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch sale months:', err);
  }
  return [];
}

export async function createSale(payload: {
  items: { productId: string; qty: number }[];
  discount: number;
  discountType: 'flat' | 'percent';
  branchId: string;
  branchName: string;
}) {
  const res = await fetch('/api/sales/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Sale failed');
  }
  appCache.invalidateSales(); // Assuming appCache is imported or triggered eventually. But we'll invalidate queries instead typically.
  return res.json();
}

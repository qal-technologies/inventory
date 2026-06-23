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
import { db } from '@/lib/firebase/client';
import type { Sale } from '@/lib/firebase/converters';
import { MOCK_SALES } from './mock_sales';
import { QUOTA_CONFIG } from '../quota-config';

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
  if (QUOTA_CONFIG.USE_MOCK_DATA) {
    console.log('Using mock sales (quota optimization)');
    let list = MOCK_SALES as Sale[];
    if (branchId) {
      list = list.filter((s) => s.branchId === branchId);
    }
    if (month) {
      list = list.filter((s) => s.createdAt.startsWith(month));
    }

    let result;
    if (lastId) {
      const idx = list.findIndex(s => s.id === lastId);
      result = list.slice(idx + 1, idx + 1 + limitCount);
    } else {
      result = list.slice(0, limitCount);
    }

    const stats = list.reduce((acc, s) => {
      acc.totalRevenue += s.total || 0;
      acc.totalProfit += s.profit || 0;
      acc.totalDiscount += s.discount || 0;
      acc.count += 1;
      return acc;
    }, { totalRevenue: 0, totalProfit: 0, totalDiscount: 0, count: 0 });

    return {
      sales: result,
      stats,
      hasMore: result.length === limitCount
    };
  }

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
    hasMore: false
  };
}

/**
 * Fetch months that have sales records.
 */
export async function fetchSaleMonths(branchId?: string): Promise<string[]> {
  try {
    const url = branchId ? `/api/sales/months?branchId=${branchId}` : '/api/sales/months';
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
  return res.json();
}

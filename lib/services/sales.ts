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
): Promise<Sale[]> {
  if (QUOTA_CONFIG.USE_MOCK_DATA) {
    console.log('Using mock sales (quota optimization)');
    let list = MOCK_SALES as Sale[];
    if (branchId) {
      list = list.filter((s) => s.branchId === branchId);
    }
    if (lastId) {
      const idx = list.findIndex(s => s.id === lastId);
      return list.slice(idx + 1, idx + 1 + limitCount);
    }
    return list.slice(0, limitCount);
  }

  // Layer 1: Client Firestore SDK
  try {
    let q;
    let lastSnapshot;
    if (lastId) {
      lastSnapshot = await getDoc(doc(db, 'sales', lastId));
    }

    if (branchId) {
      q = query(
        collection(db, 'sales'),
        where('branchId', '==', branchId),
        orderBy('createdAt', 'desc'),
        ...(lastSnapshot ? [startAfter(lastSnapshot)] : []),
        limit(limitCount),
      );
    } else {
      q = query(
        collection(db, 'sales'),
        orderBy('createdAt', 'desc'),
        ...(lastSnapshot ? [startAfter(lastSnapshot)] : []),
        limit(limitCount),
      );
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Sale);
    if (list.length > 0) {
      return list.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }
  } catch (err) {
    console.error(
      'Client sales fetch failed, trying API route fallback...',
      err,
    );
  }

  // Layer 2: API Route GET /api/sales
  try {
    let url = '/api/sales?';
    if (branchId) {
      url += `branchId=${encodeURIComponent(branchId)}&`;
    }
    if (lastId) {
      url += `lastId=${lastId}&`;
    }
    const res = await fetch(url);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        return list;
      }
    }
  } catch (err) {
    console.error('API route sales fetch failed:', err);
  }

  // Layer 3: Final Fallback (Empty)
  console.warn('[Fallback] All data sources exhausted. Returning empty list.');
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

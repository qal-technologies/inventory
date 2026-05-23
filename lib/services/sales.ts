import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Sale } from '@/lib/firebase/converters';

/**
 * Fetch sales list.
 * Falls back to server-side API route if client SDK query fails (due to rules/permissions).
 */
export async function fetchSales(branchId?: string): Promise<Sale[]> {
  // Layer 1: Client Firestore SDK
  try {
    let q;
    if (branchId) {
      q = query(
        collection(db, 'sales'),
        where('branchId', '==', branchId)
      );
    } else {
      q = query(collection(db, 'sales'));
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale));
    if (list.length > 0) {
      return list.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }
  } catch (err) {
    console.error('Client sales fetch failed, trying API route fallback...', err);
  }

  // Layer 2: API Route GET /api/sales
  try {
    let url = '/api/sales';
    if (branchId) {
      url += `?branchId=${encodeURIComponent(branchId)}`;
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

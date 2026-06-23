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
import type { Product } from '@/lib/firebase/converters';
import { MOCK_PRODUCTS } from './mock_products';
import { QUOTA_CONFIG } from '../quota-config';

/**
 * Fetch products for a specific branch.
 * Falls back to server-side API route if client SDK direct query fails (e.g. due to rules).
 * IMPORTANT: where() must come before orderBy() in Firestore queries
 */
export async function fetchProducts(
  branchId: string,
  limitCount = 20,
  lastId?: string
): Promise<Product[]> {
  if (QUOTA_CONFIG.USE_MOCK_DATA) {
    console.log('[Mock] Using mock products (quota optimization)');
    const all = (MOCK_PRODUCTS as Product[]).filter(
      (p) => p.branchId === branchId
    );
    if (lastId) {
      const idx = all.findIndex((p) => p.id === lastId);
      return all.slice(idx + 1, idx + 1 + limitCount);
    }
    return all.slice(0, limitCount);
  }

  // Layer 1: Client Firestore SDK
  try {
    let q;
    if (lastId) {
      const lastSnapshot = await getDoc(doc(db, 'products', lastId));
      // FIX: where() MUST come before orderBy()
      q = query(
        collection(db, 'products'),
        where('branchId', '==', branchId),
        orderBy('createdAt', 'desc'),
        startAfter(lastSnapshot),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, 'products'),
        where('branchId', '==', branchId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Product[];
    if (list.length > 0) {
      console.log('[Firestore] Fetched products from client SDK', {
        branchId,
        count: list.length,
      });
      return list;
    }
  } catch (err) {
    console.warn(
      '[Firestore Error] Client products fetch failed, trying API route fallback',
      err
    );
  }

  // Layer 2: API Route GET /api/products?branchId=xxx
  try {
    let url = `/api/products?branchId=${encodeURIComponent(branchId)}&limit=${limitCount}`;
    if (lastId) url += `&lastId=${lastId}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        console.log('[API] Fetched products from API route', {
          branchId,
          count: list.length,
        });
        return list;
      }
    } else {
      console.error(
        '[API Error] Products endpoint returned',
        res.status,
        res.statusText
      );
    }
  } catch (err) {
    console.error('[API Error] API route products fetch failed:', err);
  }

  // Layer 3: Mock Data Fallback
  console.warn(
    '[Fallback] Locked out of Firestore. Returning mock products.'
  );
  return MOCK_PRODUCTS.filter((p) => p.branchId === branchId).slice(
    0,
    limitCount
  );
}

/**
 * Fetch all products across all branches.
 * Falls back to server-side API route if client SDK query fails.
 */
export async function fetchAllProducts(
  limitCount = 40,
  lastId?: string
): Promise<Product[]> {
  if (QUOTA_CONFIG.USE_MOCK_DATA) {
    console.log('[Mock] Using mock products (quota optimization)');
    const all = MOCK_PRODUCTS as Product[];
    if (lastId) {
      const idx = all.findIndex((p) => p.id === lastId);
      return all.slice(idx + 1, idx + 1 + limitCount);
    }
    return all.slice(0, limitCount);
  }

  // Layer 1: Client Firestore SDK
  try {
    let q;
    if (lastId) {
      const lastSnapshot = await getDoc(doc(db, 'products', lastId));
      q = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc'),
        startAfter(lastSnapshot),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Product[];
    if (list.length > 0) {
      return list.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }
  } catch (err) {
    console.error(
      '[Firestore Error] Client fetchAllProducts failed, trying API route fallback',
      err
    );
  }

  // Layer 2: API Route
  try {
    let url = `/api/products?limit=${limitCount}`;
    if (lastId) url += `&lastId=${lastId}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        return list;
      }
    }
  } catch (err) {
    console.error('[API Error] API route fetchAllProducts failed:', err);
  }

  // Layer 3: Mock Data
  console.warn(
    '[Fallback] Locked out of Firestore. Returning mock products.'
  );
  return MOCK_PRODUCTS.slice(0, limitCount);
}

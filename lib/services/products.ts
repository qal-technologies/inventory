import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
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
 * IMPORTANT: Goes straight to the API route to avoid composite index issues
 * with client SDK (branchId + createdAt requires a Firestore composite index).
 * The Admin SDK on the server handles complex queries reliably.
 */
export async function fetchProducts(
  branchId: string,
  limitCount = 20,
  lastId?: string,
): Promise<Product[]> {
  if (QUOTA_CONFIG.USE_MOCK_DATA) {
    console.log('[Mock] Using mock products (quota optimization)');
    const all = (MOCK_PRODUCTS as Product[]).filter(
      (p) => p.branchId === branchId,
    );
    if (lastId) {
      const idx = all.findIndex((p) => p.id === lastId);
      return all.slice(idx + 1, idx + 1 + limitCount);
    }
    return all.slice(0, limitCount);
  }

  // Direct API Route — Admin SDK handles branchId + createdAt composite queries reliably
  try {
    let url = `/api/products?branchId=${encodeURIComponent(branchId)}&limit=${limitCount}`;
    if (lastId) url += `&lastId=${lastId}`;

    const res = await fetch(url, { method: 'GET' });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        console.log('[API] Fetched branch products', {
          branchId,
          count: list.length,
        });
        return list;
      }
    } else {
      console.error('[API Error] Products endpoint returned', res.status);
    }
  } catch (err) {
    console.error('[API Error] Branch products fetch failed:', err);
  }

  return [];
}

/**
 * Fetch all products across all branches (paginated).
 * Used by admin inventory page.
 * Falls back to server-side API route if client SDK query fails.
 */
export async function fetchAllProducts(
  limitCount = 40,
  lastId?: string,
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

  // Layer 1: Client Firestore SDK (no where clause — simple query, no composite index needed)
  try {
    let q;
    if (lastId) {
      const lastSnapshot = await getDoc(doc(db, 'products', lastId));
      q = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc'),
        startAfter(lastSnapshot),
        limit(limitCount),
      );
    } else {
      q = query(
        collection(db, 'products'),
        orderBy('createdAt', 'desc'),
        limit(limitCount),
      );
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Product[];
    if (list.length > 0) {
      return list;
    }
  } catch (err) {
    console.error(
      '[Firestore Error] fetchAllProducts failed, trying API fallback',
      err,
    );
  }

  // Layer 2: API Route
  try {
    let url = `/api/products?limit=${limitCount}`;
    if (lastId) url += `&lastId=${lastId}`;

    const res = await fetch(url, { method: 'GET' });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) return list;
    }
  } catch (err) {
    console.error('[API Error] fetchAllProducts API fallback failed:', err);
  }

  return [];
}

/**
 * Fetch ALL products for admin home (no pagination).
 * Used ONLY for admin dashboard statistics and calculations.
 * Results are cached by the caller (admin home) for 10 minutes.
 * Bypasses paginated fetchAllProducts to get the complete dataset.
 */
export async function fetchAdminAllProducts(): Promise<Product[]> {
  if (QUOTA_CONFIG.USE_MOCK_DATA) {
    return MOCK_PRODUCTS as Product[];
  }

  try {
    const res = await fetch('/api/products?limit=500');
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        console.log('[Admin Cache] Fetched all products for dashboard', {
          count: list.length,
        });
        return list;
      }
    }
  } catch (err) {
    console.error('[Admin Cache Error] Failed to fetch all products:', err);
  }

  return [];
}

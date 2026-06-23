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
 */
export async function fetchProducts(
  branchId: string,
  limitCount = 20,
  lastId?: string,
): Promise<Product[]> {
  if (QUOTA_CONFIG.USE_MOCK_DATA) {
    console.log('Using mock products (quota optimization)');
    const all = (MOCK_PRODUCTS as Product[]).filter((p) => p.branchId === branchId);
    if (lastId) {
      const idx = all.findIndex(p => p.id === lastId);
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
        where('branchId', '==', branchId),
        orderBy('createdAt', 'desc'),
        startAfter(lastSnapshot),
        limit(limitCount),
      );
    } else {
      q = query(
        collection(db, 'products'),
        where('branchId', '==', branchId),
        orderBy('createdAt', 'desc'),
        limit(limitCount),
      );
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
    if (list.length > 0) {
      return list;
    }
  } catch (err) {
    console.error(
      'Client products fetch failed, trying API route fallback...',
      err,
    );
  }

  // Layer 2: API Route GET /api/products?branchId=xxx
  try {
    let url = `/api/products?branchId=${encodeURIComponent(branchId)}`;
    if (lastId) url += `&lastId=${lastId}`;
    const res = await fetch(url);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        return list;
      }
    }
  } catch (err) {
    console.error('API route products fetch failed:', err);
  }

  // Layer 3: Mock Data
  console.warn('Locked out of Firestore. Returning mock products.');
  return MOCK_PRODUCTS.slice(0, limitCount);
}

/**
 * Fetch all products for a specific branch (no pagination)
 */
export async function fetchAllBranchProducts(branchId: string): Promise<Product[]> {
  if (QUOTA_CONFIG.USE_MOCK_DATA) {
    return (MOCK_PRODUCTS as Product[]).filter((p) => p.branchId === branchId);
  }

  try {
    const q = query(
      collection(db, 'products'),
      where('branchId', '==', branchId),
      orderBy('name', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
  } catch (err) {
    console.error('fetchAllBranchProducts failed, trying API route...', err);
    const res = await fetch(`/api/products?branchId=${encodeURIComponent(branchId)}&limit=1000`);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) return list;
    }
  }
  return (MOCK_PRODUCTS as Product[]).filter((p) => p.branchId === branchId);
}

/**
 * Fetch all products across all branches.
 * Falls back to server-side API route if client SDK query fails.
 */
export async function fetchAllProducts(limitCount = 40, lastId?: string): Promise<Product[]> {
  if (QUOTA_CONFIG.USE_MOCK_DATA) {
    console.log('Using mock products (quota optimization)');
    const all = MOCK_PRODUCTS as Product[];
    if (lastId) {
      const idx = all.findIndex(p => p.id === lastId);
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
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
    if (list.length > 0) {
      return list.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }
  } catch (err) {
    console.error(
      'Client fetchAllProducts failed, trying API route fallback...',
      err,
    );
  }

  // Layer 2: API Route GET /api/products
  try {
    let url = '/api/products';
    if (lastId) url += `?lastId=${lastId}`;
    const res = await fetch(url);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        return list;
      }
    }
  } catch (err) {
    console.error('API route fetchAllProducts failed:', err);
  }

  // Layer 3: Mock Data
  console.warn('Locked out of Firestore. Returning mock products.');
  return MOCK_PRODUCTS.slice(0, limitCount);
}

import {
  collection,
  getDocs,
  query,
  where,
  limit,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Product } from '@/lib/firebase/converters';
import { MOCK_PRODUCTS } from './mock_products';

/**
 * Fetch products for a specific branch.
 * Falls back to server-side API route if client SDK direct query fails (e.g. due to rules).
 */
export async function fetchProducts(
  branchId: string,
  limitCount = 20,
): Promise<Product[]> {
  // Layer 1: Client Firestore SDK
  try {
    const q = query(
      collection(db, 'products'),
      where('branchId', '==', branchId),
      orderBy('createdAt', 'desc'),
      limit(limitCount),
    );
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
    const url = `/api/products?branchId=${encodeURIComponent(branchId)}`;
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
 * Fetch all products across all branches.
 * Falls back to server-side API route if client SDK query fails.
 */
export async function fetchAllProducts(limitCount = 40): Promise<Product[]> {
  // Layer 1: Client Firestore SDK
  try {
    const q = query(collection(db, 'products'), limit(limitCount));
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
    const res = await fetch('/api/products');
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

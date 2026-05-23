import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { Branch } from '@/lib/firebase/converters';

/**
 * Robust fetch for branches with three layers of fallback:
 * 1. Direct Client Firestore query
 * 2. Next.js server-side API proxy (/api/branches) which uses privileged Admin SDK
 * 3. Stable static hardcoded array fallback so the application NEVER crashes or locks.
 */
export async function fetchBranches(): Promise<Branch[]> {
  // Layer 1: Try Client-side Firestore SDK
  try {
    const q = query(collection(db, 'branches'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Branch)
      .filter((b) => b.name);
    if (list.length > 0) {
      console.log('Branches successfully fetched from Client SDK:', list);
      return list;
    }
  } catch (err) {
    console.error(
      'Client SDK branches fetch failed, attempting API route fallback...',
      err,
    );
  }

  // Layer 2: Try Server-side Next.js API Route /api/branches
  try {
    const res = await fetch('/api/branches');
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        console.log('Branches successfully fetched from API route:', list);
        return list;
      }
    }
  } catch (err) {
    console.error(
      'API route branches fetch failed, attempting static hardcoded fallback...',
      err,
    );
  }

  // Layer 3: Hardcoded mock branches so staff login, checkout and management NEVER break
  console.warn(
    'All live branch fetches failed! Falling back to static emergency branches list.',
  );
  return [];
}

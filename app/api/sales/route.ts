import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { getSession } from '@/lib/auth/session';
import type { Sale } from '@/lib/firebase/converters';
import type { Query, QuerySnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';

// GET sales — optionally filtered by branchId, limit, and lastId
export async function GET(req: NextRequest) {
  try {
    const db = getAdminDb();
    if (!db) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const limitCount = parseInt(searchParams.get('limit') || '20');
    const lastId = searchParams.get('lastId');

    let q: Query = db.collection('sales');

    if (branchId) {
      q = q.where('branchId', '==', branchId);
    }

    q = q.orderBy('createdAt', 'desc');

    if (lastId) {
      const lastDoc = await db.collection('sales').doc(lastId).get();
      if (lastDoc.exists) {
        q = q.startAfter(lastDoc);
      }
    }

    q = q.limit(limitCount);

    const snap = await q.get() as QuerySnapshot;
    const sales = snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }) as Sale);

    return NextResponse.json(sales);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

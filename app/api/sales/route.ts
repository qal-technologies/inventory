import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getSession } from '@/lib/auth/session';

// GET sales — optionally filtered by branchId, limit, and lastId
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const limitCount = parseInt(searchParams.get('limit') || '20');
    const lastId = searchParams.get('lastId');

    let q = adminDb
      .collection('sales')
      .orderBy('createdAt', 'desc')
      .limit(limitCount);

    if (branchId) {
      q = q.where('branchId', '==', branchId);
    }

    if (lastId) {
      const lastDoc = await adminDb.collection('sales').doc(lastId).get();
      if (lastDoc.exists) {
        q = q.startAfter(lastDoc);
      }
    }

    const snap = await q.get();
    const sales = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    return NextResponse.json(sales);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

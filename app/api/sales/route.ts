import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getSession } from '@/lib/auth/session';

// GET sales — optionally filtered by branchId, month, limit, and lastId
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const month = searchParams.get('month'); // YYYY-MM
    const limitCount = parseInt(searchParams.get('limit') || '20');
    const lastId = searchParams.get('lastId');

    let baseQuery: FirebaseFirestore.Query = adminDb.collection('sales');

    if (branchId) {
      baseQuery = baseQuery.where('branchId', '==', branchId);
    }

    if (month) {
      // Create start and end range for the month
      const start = `${month}-01T00:00:00.000Z`;
      const nextMonthDate = new Date(month + '-01');
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
      const end = nextMonthDate.toISOString();

      baseQuery = baseQuery.where('createdAt', '>=', start).where('createdAt', '<', end);
    }

    // Clone for stats (without limit/pagination)
    // Limits the stats query to the last 1000 items to avoid full collection scan if it grows too large
    const statsQuery = baseQuery.limit(1000);

    // Robust query for sales
    let sales = [];
    try {
      let qWithSort = baseQuery.orderBy('createdAt', 'desc').limit(limitCount);
      if (lastId) {
        const lastDoc = await adminDb.collection('sales').doc(lastId).get();
        if (lastDoc.exists) qWithSort = qWithSort.startAfter(lastDoc);
      }
      const snap = await qWithSort.get();
      sales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err: any) {
      console.warn('[Sales API] OrderBy failed, falling back to manual sort', err.message);
      let qFallback = baseQuery.limit(limitCount * 5);
      if (lastId) {
        const lastDoc = await adminDb.collection('sales').doc(lastId).get();
        if (lastDoc.exists) qFallback = qFallback.startAfter(lastDoc);
      }
      const snap = await qFallback.get();
      sales = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      sales.sort((a: any, b: any) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      sales = sales.slice(0, limitCount);
    }

    const statsSnap = await statsQuery.get();

    // Aggregated stats
    const stats = statsSnap.docs.reduce((acc, doc) => {
      const data = doc.data();
      acc.totalRevenue += data.total || 0;
      acc.totalProfit += data.profit || 0;
      acc.totalDiscount += data.discount || 0;
      acc.count += 1;
      return acc;
    }, { totalRevenue: 0, totalProfit: 0, totalDiscount: 0, count: 0 });

    return NextResponse.json({
      sales,
      stats,
      hasMore: sales.length === limitCount
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

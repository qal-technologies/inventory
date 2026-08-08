import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getSession } from '@/lib/auth/session';

// GET sales — optionally filtered by branchId, month, limit, and lastId
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const month = searchParams.get('month'); // YYYY-MM
    const limitCount = Math.min(parseInt(searchParams.get('limit') || '20'), 5000);
    const lastId = searchParams.get('lastId');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let baseQuery: any = adminDb.collection('sales');

    if (branchId) {
      baseQuery = baseQuery.where('branchId', '==', branchId);
    }

    if (month) {
      // Create start and end range for the month
      const start = `${month}-01T00:00:00.000Z`;
      const nextMonthDate = new Date(month + '-01');
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
      const end = nextMonthDate.toISOString();

      baseQuery = baseQuery
        .where('createdAt', '>=', start)
        .where('createdAt', '<', end);
    }

    // Robust query for sales
    let sales = [];
    try {
      let qWithSort = baseQuery.orderBy('createdAt', 'desc').limit(limitCount);
      if (lastId) {
        const lastDoc = await adminDb.collection('sales').doc(lastId).get();
        if (lastDoc.exists) qWithSort = qWithSort.startAfter(lastDoc);
      }
      const snap = await qWithSort.get();
      sales = snap.docs.map((d:any) => ({ id: d.id, ...d.data() }));
    } catch (err: any) {
      console.warn(
        '[Sales API] OrderBy failed, falling back to manual sort',
        err.message,
      );
      let qFallback = baseQuery.limit(limitCount * 5);
      if (lastId) {
        const lastDoc = await adminDb.collection('sales').doc(lastId).get();
        if (lastDoc.exists) qFallback = qFallback.startAfter(lastDoc);
      }
      const snap = await qFallback.get();
      sales = snap.docs.map((d:any) => ({ id: d.id, ...d.data() }));
      sales.sort((a: any, b: any) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      sales = sales.slice(0, limitCount);
    }

    // Optimize calculations by reading pre-calculated stats document
    let statsId = 'all_all';
    if (branchId && month) {
      statsId = `branch_${branchId}_month_${month}`;
    } else if (branchId) {
      statsId = `branch_${branchId}`;
    } else if (month) {
      statsId = `month_${month}`;
    }

    const statsRef = adminDb.collection('sales_stats').doc(statsId);
    const statsDoc = await statsRef.get();

    let stats;
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!forceRefresh && statsDoc.exists && statsDoc.data()?.initialized === true) {
      const sData = statsDoc.data()!;
      stats = {
        totalRevenue: sData.totalRevenue || 0,
        totalProfit: sData.totalProfit || 0,
        totalDiscount: sData.totalDiscount || 0,
        count: sData.count || 0,
      };
    } else {
      // Lazy initialization fallback: Aggregate sales from Firestore (capped at 5000 docs)
      const statsQuery = baseQuery.limit(5000);
      const statsSnap = await statsQuery.get();
      stats = statsSnap.docs.reduce(
        (acc: any, doc: any) => {
          const data = doc.data();
          acc.totalRevenue += data.total || 0;
          acc.totalProfit += data.profit || 0;
          acc.totalDiscount += data.discount || 0;
          acc.count += 1;
          return acc;
        },
        { totalRevenue: 0, totalProfit: 0, totalDiscount: 0, count: 0 },
      );

      // Save stats document as initialized
      await statsRef.set({
        initialized: true,
        totalRevenue: stats.totalRevenue,
        totalProfit: stats.totalProfit,
        totalDiscount: stats.totalDiscount,
        count: stats.count,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      sales,
      stats,
      hasMore: sales.length === limitCount,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}

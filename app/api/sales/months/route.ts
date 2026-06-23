import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

/**
 * GET /api/sales/months
 * Returns a unique list of months (YYYY-MM) that have sales records.
 * Optimized to prevent reading all documents by only selecting the createdAt field.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

    let q: FirebaseFirestore.Query = adminDb.collection('sales');
    if (branchId) {
      q = q.where('branchId', '==', branchId);
    }

    // May 2026 boundary as requested
    const startBoundary = '2026-05-01T00:00:00.000Z';
    q = q.where('createdAt', '>=', startBoundary).orderBy('createdAt', 'desc');

    const snap = await q.select('createdAt').get();

    const monthsSet = new Set<string>();
    snap.docs.forEach(doc => {
      const createdAt = doc.data().createdAt;
      if (createdAt && typeof createdAt === 'string') {
        const ym = createdAt.substring(0, 7); // YYYY-MM
        monthsSet.add(ym);
      }
    });

    const months = Array.from(monthsSet).sort().reverse();

    return NextResponse.json(months);
  } catch (err) {
    console.error('[API Error] Failed to fetch sale months:', err);
    return NextResponse.json({ error: 'Failed to fetch months' }, { status: 500 });
  }
}

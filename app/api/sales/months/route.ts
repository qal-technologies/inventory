import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

/**
 * GET /api/sales/months
 * Returns a unique list of months (YYYY-MM) that have sales records.
 * Capped at 100 docs — enough to cover all months ever needed.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

    // Build query — type as any to avoid firebase-admin type namespace issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = adminDb.collection('sales');

    if (branchId) {
      q = q.where('branchId', '==', branchId);
    }

    // Dynamic month fetching without boundary — cap at 1000 docs to cover many months
    q = q
      .orderBy('createdAt', 'desc')
      .limit(1000);

    const snap = await q.select('createdAt').get();

    const monthsSet = new Set<string>();
    snap.docs.forEach((d: { data: () => Record<string, unknown> }) => {
      const createdAt = d.data().createdAt;
      if (createdAt && typeof createdAt === 'string') {
        monthsSet.add(createdAt.substring(0, 7)); // YYYY-MM
      }
    });

    const months = Array.from(monthsSet).sort().reverse();

    return NextResponse.json(months);
  } catch (err) {
    console.error('[API Error] Failed to fetch sale months:', err);
    return NextResponse.json({ error: 'Failed to fetch months' }, { status: 500 });
  }
}

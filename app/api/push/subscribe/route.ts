import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getSession } from '@/lib/auth/session';

/**
 * POST /api/push/subscribe
 * Save or update a push subscription for the admin.
 * Body: { subscription: PushSubscription }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { subscription } = await req.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // Upsert by endpoint — avoid duplicates
    const existing = await adminDb
      .collection('push_subscriptions')
      .where('endpoint', '==', subscription.endpoint)
      .limit(1)
      .get();

    if (existing.empty) {
      await adminDb.collection('push_subscriptions').add({
        ...subscription,
        userId: session.uid,
        role: session.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Update keys in case they rotated
      await existing.docs[0].ref.update({
        ...subscription,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Push Subscribe]', err);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscribe
 * Remove a push subscription (unsubscribe).
 * Body: { endpoint: string }
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });

    const snap = await adminDb
      .collection('push_subscriptions')
      .where('endpoint', '==', endpoint)
      .get();

    const batch = adminDb.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Push Unsubscribe]', err);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}

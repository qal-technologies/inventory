// src/lib/push/sendAdminPush.ts
import { adminDb } from '@/lib/firebase/admin';
import { broadcastPushNotification, PushPayload } from '@/lib/webpush';

/**
 * Fetch all admin push subscriptions, broadcast a push,
 * and clean up any stale/expired subscription docs.
 */
export async function sendAdminPush(payload: PushPayload): Promise<void> {
  const snap = await adminDb
    .collection('push_subscriptions')
    .where('role', '==', 'admin')
    .get();

  if (snap.empty) return;

  const subscriptions = snap.docs.map((doc) => ({
    id: doc.id,
    endpoint: doc.data().endpoint as string,
    keys: doc.data().keys as { p256dh: string; auth: string },
  }));

  const staleIds = await broadcastPushNotification(subscriptions, payload);

  // Cleanup stale subscriptions in a single batch
  if (staleIds.length > 0) {
    const batch = adminDb.batch();
    staleIds.forEach((id) => {
      batch.delete(adminDb.collection('push_subscriptions').doc(id));
    });
    await batch.commit();
    console.log(`[Push] Removed ${staleIds.length} stale subscription(s)`);
  }
}

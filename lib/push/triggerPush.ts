/**
 * Push Notification Trigger
 * Handles immediate push notifications with short deduplication
 * No Cloud Functions - sends immediately when user is active on site
 */

import { adminDb } from '@/lib/firebase/admin';
import { broadcastPushNotification } from '@/lib/webpush';
import type { PushPayload } from '@/lib/webpush';
import { notificationDedup } from '@/lib/services/notificationDedup';

export interface AdminPushOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

/**
 * Trigger push notification to admins
 * Sends immediately with 30-second deduplication window
 * Perfect for Spark plan (no Cloud Functions needed)
 */
export async function triggerAdminPush(
  options: AdminPushOptions
): Promise<{ success: boolean; sent: number }> {
  const { ...payload } = options;

  try {
    // Dedup key: admin-all-inventory
    const shouldSend = notificationDedup.shouldNotify('admin', undefined, 'inventory');

    if (!shouldSend) {
      console.log('[Push] Skipped duplicate admin notification within 30s');
      return { success: true, sent: 0 };
    }

    // Fetch admin subscriptions
    const subsSnap = await adminDb
      .collection('admin_push_subscriptions')
      .get();

    if (subsSnap.empty) {
      console.log('[Push] No admin subscriptions found');
      return { success: true, sent: 0 };
    }

    const subscriptions = subsSnap.docs.map((doc) => ({
      ...(doc.data() as any),
      id: doc.id,
    }));

    // Send push to all subscribers
    const staleIds = await broadcastPushNotification(
      subscriptions,
      payload as PushPayload
    );

    // Clean up stale subscriptions
    if (staleIds.length > 0) {
      const batch = adminDb.batch();
      staleIds.forEach((id) => {
        batch.delete(
          adminDb.collection('admin_push_subscriptions').doc(id)
        );
      });
      await batch.commit();
      console.log('[Push] Removed stale subscriptions', { count: staleIds.length });
    }

    const sentCount = subscriptions.length - staleIds.length;

    console.log('[Push] Sent immediate push to admins', {
      title: payload.title,
      sent: sentCount,
    });

    return { success: true, sent: sentCount };
  } catch (err) {
    console.error('[Push Error] Failed to trigger admin notification', err);
    return { success: false, sent: 0 };
  }
}

/**
 * Trigger branch-specific push with 30-second deduplication
 * Sends immediately with short dedup window
 */
export async function triggerBranchPush(
  branchId: string,
  productId: string | undefined,
  options: AdminPushOptions
): Promise<{ success: boolean; sent: number; deduped: boolean }> {
  try {
    // Determine notification type from tag
    const type = options.tag === 'danger' ? 'out-of-stock' : 'low-stock';

    // Check dedup cache (30 second window)
    const shouldSend = notificationDedup.shouldNotify(branchId, productId, type);

    if (!shouldSend) {
      console.log('[Push] Skipped duplicate branch notification within 30s', {
        branchId,
        productId,
        type,
      });
      return { success: true, sent: 0, deduped: true };
    }

    // Fetch branch staff subscriptions
    const subsSnap = await adminDb
      .collection('branch_push_subscriptions')
      .where('branchId', '==', branchId)
      .get();

    if (subsSnap.empty) {
      console.log('[Push] No subscriptions for branch', { branchId });
      return { success: true, sent: 0, deduped: false };
    }

    const subscriptions = subsSnap.docs.map((doc) => ({
      ...(doc.data() as any),
      id: doc.id,
    }));

    // Send push to branch staff
    const staleIds = await broadcastPushNotification(
      subscriptions,
      options as PushPayload
    );

    // Clean up stale subscriptions
    if (staleIds.length > 0) {
      const batch = adminDb.batch();
      staleIds.forEach((id) => {
        batch.delete(
          adminDb.collection('branch_push_subscriptions').doc(id)
        );
      });
      await batch.commit();
    }

    const sentCount = subscriptions.length - staleIds.length;

    console.log('[Push] Sent branch notification', {
      branchId,
      productId,
      type,
      sent: sentCount,
    });

    return { success: true, sent: sentCount, deduped: false };
  } catch (err) {
    console.error('[Push Error] Failed to trigger branch notification', err);
    return { success: false, sent: 0, deduped: false };
  }
}

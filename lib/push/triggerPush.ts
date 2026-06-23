/**
 * Push Notification Trigger
 * Handles both immediate and queued push notifications
 */

import { adminDb } from '@/lib/firebase/admin';
import { broadcastPushNotification } from '@/lib/webpush';
import type { PushPayload } from '@/lib/webpush';
import { queueNotification, isDuplicateAlert } from '@/lib/services/notificationQueue';

export interface AdminPushOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  immediate?: boolean; // Send now instead of queuing (default: false)
}

/**
 * Trigger push notification to admins
 * By default queues for batch processing (saves writes)
 * Can optionally send immediately for critical alerts
 */
export async function triggerAdminPush(
  options: AdminPushOptions
): Promise<{ queued: boolean; immediate?: boolean }> {
  const { immediate = false, ...payload } = options;

  try {
    if (immediate) {
      // Send immediately (only for critical alerts)
      const subsSnap = await adminDb
        .collection('admin_push_subscriptions')
        .get();

      if (subsSnap.empty) {
        console.log(
          '[Push] No admin subscriptions found for immediate push'
        );
        return { queued: false, immediate: true };
      }

      const subscriptions = subsSnap.docs.map((doc) => ({
        ...(doc.data() as any),
        id: doc.id,
      }));

      const staleIds = await broadcastPushNotification(subscriptions, payload as PushPayload);

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

      console.log('[Push] Sent immediate push to admins', {
        title: payload.title,
        count: subscriptions.length - staleIds.length,
      });

      return { queued: false, immediate: true };
    } else {
      // Queue for batch processing (preferred for non-critical notifications)
      await queueNotification({
        type: 'inventory',
        branchId: 'all',
        title: payload.title,
        message: payload.body,
        severity: payload.tag === 'danger' ? 'danger' : 'warning',
        data: { url: payload.url },
      });

      console.log('[Push] Queued notification for batch processing', {
        title: payload.title,
      });

      return { queued: true };
    }
  } catch (err) {
    console.error('[Push Error] Failed to trigger notification', err);
    throw err;
  }
}

/**
 * Trigger branch-specific push with deduplication
 */
export async function triggerBranchPush(
  branchId: string,
  productId: string | undefined,
  options: Omit<AdminPushOptions, 'immediate'>
): Promise<void> {
  try {
    // Determine notification type from title/tag
    const type = options.tag === 'danger' ? 'out-of-stock' : 'low-stock';

    // Check for duplicates within 15 minute window
    if (productId) {
      const isDuplicate = await isDuplicateAlert(
        branchId,
        productId,
        type,
        15
      );

      if (isDuplicate) {
        console.log(
          '[Push] Skipped duplicate alert',
          { branchId, productId, type }
        );
        return;
      }
    }

    // Queue the notification
    await queueNotification({
      type: type as any,
      branchId,
      productId,
      title: options.title,
      message: options.body,
      severity: options.tag === 'danger' ? 'danger' : 'warning',
      data: { url: options.url },
    });

    console.log('[Push] Queued branch notification', {
      branchId,
      productId,
      type,
    });
  } catch (err) {
    console.error('[Push Error] Failed to trigger branch push', err);
    throw err;
  }
}

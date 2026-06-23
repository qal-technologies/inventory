/**
 * Notification Queue Manager
 * Batches and debounces notifications to reduce database writes
 * Processes in scheduled batches instead of immediately sending
 */

import { adminDb } from '@/lib/firebase/admin';
import type { Timestamp } from 'firebase/firestore';

export interface QueuedNotification {
  type: 'stock-alert' | 'sale' | 'inventory' | 'low-stock' | 'out-of-stock';
  branchId: string;
  productId?: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'danger';
  data?: Record<string, any>;
  createdAt: string; // ISO string
}

/**
 * Add notification to queue for batch processing
 * Instead of sending immediately, store for later batch processing
 */
export async function queueNotification(
  notification: Omit<QueuedNotification, 'createdAt'>
): Promise<string> {
  try {
    const docRef = await adminDb
      .collection('notification_queue')
      .add({
        ...notification,
        createdAt: new Date().toISOString(),
        processed: false,
      });

    console.log('[Notification Queue] Added notification to queue', {
      type: notification.type,
      branchId: notification.branchId,
      docId: docRef.id,
    });

    return docRef.id;
  } catch (err) {
    console.error('[Notification Queue Error] Failed to queue notification', err);
    throw err;
  }
}

/**
 * Check for duplicate notifications in queue
 * Prevents sending duplicate alerts within debounce window
 */
export async function isDuplicateAlert(
  branchId: string,
  productId: string,
  type: string,
  debounceMinutes: number = 15
): Promise<boolean> {
  try {
    const cutoff = new Date(Date.now() - debounceMinutes * 60 * 1000);

    const snap = await adminDb
      .collection('notification_queue')
      .where('branchId', '==', branchId)
      .where('productId', '==', productId)
      .where('type', '==', type)
      .where('createdAt', '>=', cutoff.toISOString())
      .limit(1)
      .get();

    return !snap.empty;
  } catch (err) {
    console.error('[Notification Queue Error] Duplicate check failed', err);
    return false;
  }
}

/**
 * Batch process queued notifications
 * Should be called by a Cloud Function on a schedule (e.g., every 15 minutes)
 */
export async function processBatchNotifications(maxBatchSize: number = 50) {
  try {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);

    const snap = await adminDb
      .collection('notification_queue')
      .where('processed', '==', false)
      .where('createdAt', '<', cutoff.toISOString())
      .orderBy('createdAt', 'asc')
      .limit(maxBatchSize)
      .get();

    if (snap.empty) {
      console.log('[Notification Batch] No notifications to process');
      return 0;
    }

    // Group by branch and type for summary notifications
    const grouped = new Map<
      string,
      {
        items: any[];
        branchId: string;
        type: string;
        severity: string;
      }
    >();

    snap.forEach((doc) => {
      const data = doc.data();
      const key = `${data.branchId}:${data.type}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          items: [],
          branchId: data.branchId,
          type: data.type,
          severity: data.severity,
        });
      }

      grouped.get(key)!.items.push({
        docId: doc.id,
        ...data,
      });
    });

    // Send one summary notification per group
    let successCount = 0;

    for (const [key, group] of grouped) {
      try {
        const summary =
          group.items.length === 1
            ? group.items[0].message
            : `${group.items.length} ${group.type} notifications for ${group.branchId}`;

        console.log('[Notification Batch] Sending summary:', {
          key,
          count: group.items.length,
          summary,
        });

        // Mark all items as processed
        const batch = adminDb.batch();
        group.items.forEach((item) => {
          batch.update(adminDb.collection('notification_queue').doc(item.docId), {
            processed: true,
            processedAt: new Date().toISOString(),
          });
        });
        await batch.commit();

        successCount += group.items.length;
      } catch (err) {
        console.error('[Notification Batch Error] Failed to process group', key, err);
      }
    }

    console.log('[Notification Batch] Processed notifications', {
      totalItems: snap.size,
      successCount,
    });

    return successCount;
  } catch (err) {
    console.error('[Notification Batch Error] Batch processing failed', err);
    throw err;
  }
}

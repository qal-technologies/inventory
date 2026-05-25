/**
 * Server-side Web Push (VAPID) helper.
 * Sends push notifications to subscribed devices.
 */
import webpush from 'web-push';

let initialized = false;

function ensureInit() {
  if (initialized) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@app.com';

  if (!publicKey || !privateKey) {
    console.warn('[WebPush] VAPID keys not configured. Push notifications disabled.');
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to a single subscription object.
 * Returns true on success, false on failure (subscription may be stale).
 */
export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  ensureInit();
  if (!initialized) return false;

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired or invalid — caller should remove it
      return false;
    }
    console.error('[WebPush] Send error:', err);
    return false;
  }
}

/**
 * Send a push notification to multiple subscriptions.
 * Returns array of subscription endpoints that are stale and should be removed.
 */
export async function broadcastPushNotification(
  subscriptions: Array<webpush.PushSubscription & { id?: string }>,
  payload: PushPayload
): Promise<string[]> {
  ensureInit();
  if (!initialized || !subscriptions.length) return [];

  const staleIds: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const ok = await sendPushNotification(sub, payload);
      if (!ok && sub.id) {
        staleIds.push(sub.id);
      }
    })
  );

  return staleIds;
}

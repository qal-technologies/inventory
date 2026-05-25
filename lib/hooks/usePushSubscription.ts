'use client';

import { useEffect, useRef } from 'react';

/**
 * Registers the service worker and subscribes the admin browser
 * to web push. Unsubscribes cleanly on unmount or page unload.
 *
 * Only runs when `enabled` is true (i.e. user is an admin).
 */
export function usePushSubscription(enabled: boolean) {
  const subscriptionRef = useRef<PushSubscription | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    let cancelled = false;

    async function subscribe() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          console.warn('[Push] VAPID public key not set');
          return;
        }

        const existing = await reg.pushManager.getSubscription();
        const subscription =
          existing ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
          }));

        if (cancelled) return;

        subscriptionRef.current = subscription;

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
      } catch (err) {
        console.error('[Push] Subscription error:', err);
      }
    }

    subscribe();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Cleanup: unsubscribe from push manager when component unmounts
  useEffect(() => {
    return () => {
      const sub = subscriptionRef.current;
      if (!sub) return;
      sub.unsubscribe().then(() => {
        fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
      });
    };
  }, []);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

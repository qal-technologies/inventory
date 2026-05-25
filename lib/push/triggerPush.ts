// src/lib/push/triggerPush.ts
import { PushPayload } from '@/lib/webpush';

/**
 * Fire-and-forget push trigger called from other API routes.
 * Errors are logged but never bubble up — push is non-critical.
 */
export async function triggerAdminPush(payload: PushPayload): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL : 'https://inventory-phi-ruddy.vercel.app';
    await fetch(`${baseUrl}/api/push/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_API_SECRET ?? '',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[triggerAdminPush]', err);
  }
}

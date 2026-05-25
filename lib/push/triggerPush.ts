import { PushPayload } from '@/lib/webpush';
import { sendAdminPush } from './sendAdminPush';

/**
 * Fire-and-forget push trigger called from other API routes.
 * Tries direct function call first, falls back to internal API if needed.
 * Errors are logged but never bubble up — push is non-critical.
 */
export async function triggerAdminPush(payload: PushPayload): Promise<void> {
  try {
    // Try direct call first
    await sendAdminPush(payload);
  } catch (err) {
    console.error('[triggerAdminPush] Direct call failed:', err);

    // Fallback to internal API call
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://inventory-phi-ruddy.vercel.app';
      const response = await fetch(`${baseUrl}/api/push/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.INTERNAL_API_SECRET ?? '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[triggerAdminPush] Fallback API failed (${response.status}):`, text);
      }
    } catch (fallbackErr) {
      console.error('[triggerAdminPush] Fallback API error:', fallbackErr);
    }
  }
}

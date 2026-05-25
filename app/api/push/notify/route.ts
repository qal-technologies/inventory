// src/app/api/push/notify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendAdminPush } from '@/lib/push/sendAdminPush';
import { PushPayload } from '@/lib/webpush';

/**
 * POST /api/push/notify
 * Internal server-to-server route. Sends a push to all subscribed admins.
 * Secured by INTERNAL_API_SECRET — never call this from the client.
 *
 * Body: PushPayload
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret');
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const payload: PushPayload = await req.json();
    if (!payload.title || !payload.body) {
      return NextResponse.json(
        { error: 'title and body are required' },
        { status: 400 },
      );
    }
    await sendAdminPush(payload);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Push Notify]', err);
    return NextResponse.json({ error: 'Push failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getSession, clearSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.uid) {
      return NextResponse.json({ isValid: false }, { status: 401 });
    }

    const userDoc = await adminDb.collection('users').doc(session.uid).get();
    if (!userDoc.exists) {
      await clearSession();
      return NextResponse.json({ isValid: false }, { status: 401 });
    }

    const dbToken = userDoc.data()?.deviceToken;

    // If there's no token in DB, it's an old login, let it pass or force them to re-login.
    // Forcing re-login is safer if we want strict single-device limit immediately.
    if (!dbToken || dbToken !== session.deviceToken) {
      await clearSession();
      return NextResponse.json({ isValid: false, reason: 'device_mismatch' }, { status: 401 });
    }

    return NextResponse.json({ isValid: true });
  } catch (err) {
    console.error('Verify device error:', err);
    return NextResponse.json({ isValid: false }, { status: 500 });
  }
}

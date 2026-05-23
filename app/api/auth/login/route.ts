import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { setSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const decoded = await adminAuth.verifyIdToken(idToken);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not registered in system' }, { status: 403 });
    }

    const data = userDoc.data()!;
    await setSession({
      uid: decoded.uid,
      role: data.role,
      name: data.name,
      email: data.email,
    });

    return NextResponse.json({ role: data.role, name: data.name });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}

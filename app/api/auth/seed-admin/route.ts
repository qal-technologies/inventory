import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, admin } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    // Write Firestore user doc with role
    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name,
      role: admin ? 'admin' : 'staff',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ uid: userRecord.uid, role: admin ? 'admin' : 'staff' }, { status: 201 });
  } catch (err: any) {
    console.error('Seed admin error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to seed admin' }, { status: 500 });
  }
}

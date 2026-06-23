import { NextRequest, NextResponse } from 'next/server';
import { setSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const user = await req.json();
    await setSession({
      uid: user.uid,
      role: user.role,
      name: user.name,
      email: user.email,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Mock login failed' }, { status: 500 });
  }
}

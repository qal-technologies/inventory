import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { adminDb } from '@/lib/firebase/admin';
import { getSession, setBranchSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { branchId, key } = await req.json();
    if (!branchId || !key) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const branchDoc = await adminDb.collection('branches').doc(branchId).get();
    if (!branchDoc.exists) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

    const branch = branchDoc.data()!;
    const valid = await bcrypt.compare(key, branch.keyHash);

    if (!valid) return NextResponse.json({ error: 'Invalid branch key' }, { status: 403 });

    await setBranchSession({ branchId, branchName: branch.name });
    return NextResponse.json({ branchName: branch.name });
  } catch (err) {
    console.error('Branch key error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

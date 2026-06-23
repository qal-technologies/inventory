import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { adminDb } from '@/lib/firebase/admin';
import { getSession } from '@/lib/auth/session';

// GET all branches (public names only, no key hashes)
export async function GET() {
  try {
    const snap = await adminDb.collection('branches').orderBy('name').get();
    const branches = snap.docs
      .map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          address: data.address || '',
          paymentAccount: data.paymentAccount || '',
          paymentBank: data.paymentBank || '',
          paymentAccountName: data.paymentAccountName || '',
        };
      })
      .filter((b: any) => b.name);
    return NextResponse.json(branches);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 });
  }
}

// POST — admin creates a new branch
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { name, address, paymentAccount, paymentBank, paymentAccountName, key } = await req.json();
    if (!name || !key) return NextResponse.json({ error: 'Name and key required' }, { status: 400 });

    const keyHash = await bcrypt.hash(key, 10);
    const docRef = await adminDb.collection('branches').add({
      name: name?.toLowerCase(),
      address: address || '',
      paymentAccount: paymentAccount || '',
      paymentBank: paymentBank || '',
      paymentAccountName: paymentAccountName || '',
      keyHash,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 });
  }
}

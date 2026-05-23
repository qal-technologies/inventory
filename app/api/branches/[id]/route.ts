import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { adminDb } from '@/lib/firebase/admin';
import { getSession } from '@/lib/auth/session';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const doc = await adminDb.collection('branches').doc(id).get();
    if (!doc.exists) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    const data = doc.data();
    return NextResponse.json({
      id: doc.id,
      name: data?.name,
      address: data?.address || '',
      paymentAccount: data?.paymentAccount || '',
      paymentBank: data?.paymentBank || '',
      paymentAccountName: data?.paymentAccountName || '',
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch branch' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await req.json();
    const { name, address, paymentAccount, paymentBank, paymentAccountName, key } = body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (paymentAccount !== undefined) updates.paymentAccount = paymentAccount;
    if (paymentBank !== undefined) updates.paymentBank = paymentBank;
    if (paymentAccountName !== undefined) updates.paymentAccountName = paymentAccountName;

    if (key) {
      updates.keyHash = await bcrypt.hash(key, 10);
    }

    await adminDb.collection('branches').doc(id).update(updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update branch' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    await adminDb.collection('branches').doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete branch' }, { status: 500 });
  }
}

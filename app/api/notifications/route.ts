import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import {getSession} from '@/lib/auth/session';
import { triggerAdminPush } from '@/lib/push/triggerPush';


import type { Query, QuerySnapshot, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getAdminDb();
    if (!db) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 });

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

    let q: Query = db.collection('notifications');
    const snap = await adminDb.collection('notifications').get();
    let list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (branchId) {
      q = q.where('branchId', '==', branchId);
    }

    q = q.orderBy('createdAt', 'desc').limit(100);

    const snap = await q.get() as QuerySnapshot;
    const list = snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }));

    return NextResponse.json(list);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing notification id' }, { status: 400 });

    await adminDb.collection('notifications').doc(id).update({ read: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, type = 'info', branchId } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
    }

    const ref = await adminDb.collection('notifications').add({
      title,
      message,
      type,
      branchId: branchId ?? null,
      read: false,
      createdAt: new Date().toISOString(),
    });

    // Fire push to all admins
    await triggerAdminPush({
      title,
      body: message,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: type,
      url: '/admin/notifications',
    });

    return NextResponse.json({ id: ref.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await req.json();

  // Fetch the notification
  const doc = await adminDb.collection('notifications').doc(id).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  // Delete from Firestore
  await adminDb.collection('notifications').doc(id).delete();

  return NextResponse.json({ ok: true });
}
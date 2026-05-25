import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { adminDb } from '@/lib/firebase/admin';
import { getSession } from '@/lib/auth/session';
import { deleteCloudinaryImage } from '@/lib/cloudinaryAdmin';
import { triggerAdminPush } from '@/lib/push/triggerPush';

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

    // Read the current branch to detect if the name is changing
    const branchDoc = await adminDb.collection('branches').doc(id).get();
    const oldName: string = branchDoc.exists ? (branchDoc.data()?.name ?? '') : '';

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (paymentAccount !== undefined) updates.paymentAccount = paymentAccount;
    if (paymentBank !== undefined) updates.paymentBank = paymentBank;
    if (paymentAccountName !== undefined) updates.paymentAccountName = paymentAccountName;

    if (key) {
      updates.keyHash = await bcrypt.hash(key, 10);
    }

    // Update the branch document itself (ID never changes)
    await adminDb.collection('branches').doc(id).update(updates);

    // If the branch name changed, propagate the new name to all existing sales
    const newName: string = name !== undefined ? name : oldName;
    if (name !== undefined && name !== oldName) {
      // Fetch all sales for this branch
      const salesSnap = await adminDb
        .collection('sales')
        .where('branchId', '==', id)
        .get();

      if (!salesSnap.empty) {
        const BATCH_SIZE = 499;
        const saleDocs = salesSnap.docs;
        for (let i = 0; i < Math.ceil(saleDocs.length / BATCH_SIZE); i++) {
          const batch = adminDb.batch();
          const chunk = saleDocs.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
          chunk.forEach((doc) => batch.update(doc.ref, { branchName: newName }));
          await batch.commit();
        }
      }

      // Create a notification for the rename
      const title = 'Branch Renamed';
      const message = `Branch "${oldName}" has been renamed to "${newName}". All sales records updated.`;

      await adminDb.collection('notifications').add({
        type: 'info',
        title,
        message,
        branchId: id,
        read: false,
        createdAt: new Date().toISOString(),
      });

      await triggerAdminPush({
        title,
        body: message,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: 'info',
        url: '/admin/notifications',
      });
    }

    return NextResponse.json({ ok: true, oldName, newName });
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
    let pendingPushesForBatch: any[] = [];

    // 1. Fetch branch info for notification
    const branchDoc = await adminDb.collection('branches').doc(id).get();
    const branchName = branchDoc.exists ? (branchDoc.data()?.name || id) : id;

    // 2. Fetch all products linked to this branch
    const productsSnap = await adminDb
      .collection('products')
      .where('branchId', '==', id)
      .get();

    const productCount = productsSnap.docs.length;

    // 3. Fetch all sales linked to this branch
    const salesSnap = await adminDb
      .collection('sales')
      .where('branchId', '==', id)
      .get();

    const salesCount = salesSnap.docs.length;

    // 4. Collect Cloudinary image URLs for cleanup (async, after response)
    const imageUrls: string[] = productsSnap.docs
      .map((d) => d.data().imageUrl as string)
      .filter((url) => url && url.includes('cloudinary.com'));

    // 5. Batch-delete all products + sales + the branch in Firestore batches
    const BATCH_SIZE = 499; // Firestore limit is 500 ops per batch
    const allProductDocs = [...productsSnap.docs];
    const allSalesDocs = [...salesSnap.docs];

    // Delete products in chunks (Math.max(1,...) ensures we always run at least once so the
    // branch document itself and the notification are always committed even with 0 products)
    for (let i = 0; i < Math.max(1, Math.ceil(allProductDocs.length / BATCH_SIZE)); i++) {
      const batch = adminDb.batch();
      const chunk = allProductDocs.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      chunk.forEach((doc) => batch.delete(doc.ref));

      // Delete the branch itself and add notification in the first batch
      if (i === 0) {
        batch.delete(adminDb.collection('branches').doc(id));

        const notifRef = adminDb.collection('notifications').doc();
        const title = 'Branch Deleted';
        const message = `Branch "${branchName}" and its ${productCount} product(s) and ${salesCount} sale record(s) have been permanently deleted.`;

        batch.set(notifRef, {
          type: 'info',
          title,
          message,
          branchId: id,
          read: false,
          createdAt: new Date().toISOString(),
        });

        pendingPushesForBatch.push({
          title,
          body: message,
          icon: '/favicon.png',
          badge: '/favicon.png',
          tag: 'info',
          url: '/admin/notifications',
        });
      }

      await batch.commit();
      await Promise.allSettled(pendingPushesForBatch.map(p => triggerAdminPush(p)));
      pendingPushesForBatch = [];
    }

    // Delete sales in chunks (separate batches after branch/products are gone)
    for (let i = 0; i < Math.ceil(allSalesDocs.length / BATCH_SIZE); i++) {
      const batch = adminDb.batch();
      const chunk = allSalesDocs.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      chunk.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    // 6. Fire-and-forget Cloudinary cleanup for all product images
    if (imageUrls.length > 0) {
      Promise.allSettled(imageUrls.map((url) => deleteCloudinaryImage(url))).catch((err) =>
        console.error('[Branch DELETE] Cloudinary cleanup error:', err)
      );
    }

    return NextResponse.json({
      ok: true,
      deletedProducts: productCount,
      deletedSales: salesCount,
      branchName,
    });
  } catch (err) {
    console.error('[Branch DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete branch' }, { status: 500 });
  }
}


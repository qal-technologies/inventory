import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getSession } from '@/lib/auth/session';
import { deleteCloudinaryImage } from '@/lib/cloudinaryAdmin';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await adminDb.collection('products').doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ id: doc.id, ...doc.data() });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const updates = { ...body, updatedAt: new Date().toISOString() };
  if (updates.sellingPrice != null) updates.sellingPrice = Number(updates.sellingPrice);
  if (updates.buyingPrice != null) updates.buyingPrice = Number(updates.buyingPrice);
  if (updates.stock !== undefined) updates.stock = Number(updates.stock);
  if (updates.reorder !== undefined) updates.reorder = Number(updates.reorder);

  const docRef = adminDb.collection('products').doc(id);
  const doc = await docRef.get();
  if (doc.exists) {
    const prod = doc.data()!;
    const newStock = updates.stock !== undefined ? updates.stock : prod.stock;
    const reorderVal = updates.reorder !== undefined ? updates.reorder : (prod.reorder || 5);
    if (newStock <= reorderVal) {
      await adminDb.collection('notifications').add({
        type: newStock === 0 ? 'danger' : 'warning',
        title: newStock === 0 ? 'Out of Stock' : 'Low Stock Alert',
        message: `${updates.name || prod.name} has been updated to ${newStock} units left at branch ${updates.branchId || prod.branchId}`,
        branchId: updates.branchId || prod.branchId,
        productId: id,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  await docRef.update(updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  // Fetch the product to get its imageUrl before deleting
  const doc = await adminDb.collection('products').doc(id).get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const product = doc.data()!;
  const imageUrl: string = product.imageUrl || '';

  // Delete from Firestore
  await adminDb.collection('products').doc(id).delete();

  // Delete from Cloudinary (fire-and-forget — don't block response on this)
  if (imageUrl && imageUrl.includes('cloudinary.com')) {
    deleteCloudinaryImage(imageUrl).catch((err) => {
      console.error('[Product DELETE] Cloudinary cleanup error:', err);
    });
  }

  return NextResponse.json({ ok: true });
}

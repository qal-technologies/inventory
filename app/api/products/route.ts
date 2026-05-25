import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getSession } from '@/lib/auth/session';
import { triggerAdminPush } from '@/lib/push/triggerPush';

// GET /api/products?branchId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

    const snap = await adminDb.collection('products').get();
    let products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (branchId) {
      products = products.filter((p: any) => p.branchId === branchId);
    }

    products.sort((a: any, b: any) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json(products);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 },
    );
  }
}

// POST /api/products
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const {
      name,
      description,
      imageUrl,
      sellingPrice,
      buyingPrice,
      stock,
      branchId,
      category,
      reorder,
    } = body;

    if (!name || sellingPrice == null || buyingPrice == null || !branchId)
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );

    const now = new Date().toISOString();
    const docRef = await adminDb.collection('products').add({
      name,
      description: description || '',
      imageUrl: imageUrl || '',
      sellingPrice: Number(sellingPrice),
      buyingPrice: Number(buyingPrice),
      reorder: Number(reorder) || 0,
      stock: Number(stock) || 0,
      branchId,
      category: category || 'General',
      createdAt: now,
      updatedAt: now,
    });

    const stockVal = Number(stock) || 0;
    const reorderVal = Number(reorder) || 5;
    if (stockVal <= reorderVal) {
      const title = stockVal === 0 ? 'Out of Stock' : 'Low Stock Alert';
      const message = `${name} has been added with ${stockVal} units left at branch ${branchId}`;
      const type = stockVal === 0 ? 'danger' : 'warning';

      await adminDb.collection('notifications').add({
        type,
        title,
        message,
        branchId,
        productId: docRef.id,
        read: false,
        createdAt: new Date().toISOString(),
      });

      await triggerAdminPush({
        title,
        body: message,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: type,
        url: '/admin/notifications',
      });
    }

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 },
    );
  }
}

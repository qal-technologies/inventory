import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import {getSession, getBranchSession} from '@/lib/auth/session';
import { triggerAdminPush } from '@/lib/push/triggerPush';


export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const branchSession = await getBranchSession();
    const body = await req.json();

    const branchId =
      session.role === 'admin' ? body.branchId : branchSession?.branchId;
    if (!branchId)
      return NextResponse.json(
        { error: 'No branch selected' },
        { status: 400 },
      );

    const { items, discount = 0, discountType = 'flat', branchName } = body;
    if (!items?.length)
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });

    // Validate stock and compute profit inside a transaction
    const saleRef = adminDb.collection('sales').doc();
    const pendingPushes: any[] = [];

    const prodRefs = items.map((item: any) =>
      adminDb.collection('products').doc(item.productId),
    );

    await adminDb.runTransaction(async (tx: any) => {
      pendingPushes.length = 0; // Clear on retry
      const prodDocs = await Promise.all(
        prodRefs.map((ref: any) => tx.get(ref)),
      );

      for (let i = 0; i < prodDocs.length; i++) {
        const prodDoc = prodDocs[i];
        const item = items[i];

        if (!prodDoc.exists) {
          throw new Error(`Product ${item.productId} not found`);
        }

        const prod = prodDoc.data()!;
        if (prod.stock < item.qty) {
          throw new Error(`Insufficient stock for "${prod.name}"`);
        }
      }

      let subtotal = 0;
      let grossProfit = 0;
      const saleItems = [];

      for (let i = 0; i < prodDocs.length; i++) {
        const prodDoc = prodDocs[i];
        const item = items[i];
        const prod = prodDoc.data()!;

        const itemRevenue = prod.sellingPrice * item.qty;
        const itemCost = prod.buyingPrice * item.qty;
        const itemProfit = itemRevenue - itemCost;

        subtotal += itemRevenue;
        grossProfit += itemProfit;

        saleItems.push({
          productId: item.productId,
          name: prod.name,
          qty: item.qty,
          sellingPrice: prod.sellingPrice,
          buyingPrice: prod.buyingPrice,
          itemProfit,
        });

        const newStock = prod.stock - item.qty;
        tx.update(prodRefs[i], {
          stock: newStock,
          updatedAt: new Date().toISOString(),
        });

        const reorderLimit = prod.reorder || 5;
        if (newStock <= reorderLimit) {
          const notifRef = adminDb.collection('notifications').doc();
          const type = newStock === 0 ? 'danger' : 'warning';
          const title = newStock === 0 ? 'Out of Stock' : 'Low Stock Alert';
          const message = `${prod.name} has reached ${newStock} units left at ${branchName || branchId} branch.`;

          tx.set(notifRef, {
            type,
            title,
            message,
            branchId,
            productId: item.productId,
            read: false,
            createdAt: new Date().toISOString(),
          });

          pendingPushes.push({
            title,
            body: message,
            icon: '/favicon.png',
            badge: '/favicon.png',
            tag: type,
            url: '/admin/notifications',
          });
        }
      }

      // Discount calc
      const discountAmount =
        discountType === 'percent' ?
          Math.min((discount / 100) * subtotal, subtotal)
        : Math.min(discount, subtotal);

      const total = subtotal - discountAmount;
      const saleProfit = grossProfit - discountAmount;
      const profitMargin = total > 0 ? (saleProfit / total) * 100 : 0;

      tx.set(saleRef, {
        branchId,
        branchName: branchName || '',
        staffId: session.uid,
        staffName: session.name,
        items: saleItems,
        subtotal,
        discount: discountAmount,
        total,
        profit: saleProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        status: 'completed',
        createdAt: new Date().toISOString(),
      });

      const saleNotifRef = adminDb.collection('notifications').doc();
      const saleTitle = 'Sale Completed';
      const saleMessage = `Sale processed successfully at ${branchName || branchId} branch.`;

      tx.set(saleNotifRef, {
        type: 'success',
        title: saleTitle,
        message: saleMessage,
        branchId,
        read: false,
        createdAt: new Date().toISOString(),
      });

      pendingPushes.push({
        title: saleTitle,
        body: saleMessage,
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: 'sale-completed',
        url: '/admin/notifications',
      });
    });

    // Trigger all push notifications AFTER the transaction has committed successfully
    await Promise.allSettled(pendingPushes.map(push => triggerAdminPush(push)));

    return NextResponse.json({ saleId: saleRef.id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sale failed';
    console.error('Sale error:', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

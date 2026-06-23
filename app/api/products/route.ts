import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getSession } from '@/lib/auth/session';
import { triggerBranchPush } from '@/lib/push/triggerPush';
import {
  ValidationError,
  AuthorizationError,
  formatErrorResponse,
  logError,
  handleFirebaseError,
} from '@/lib/error-handler';

/**
 * GET /api/products?branchId=xxx&limit=20&lastId=xxx
 * Fetch products with pagination and optional branch filter
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const limitCount = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Cap at 100
    const lastId = searchParams.get('lastId');

    // Validation
    if (limitCount < 1 || limitCount > 100) {
      throw new ValidationError('limit must be between 1 and 100');
    }

    let q = adminDb
      .collection('products')
      .orderBy('createdAt', 'desc')
      .limit(limitCount);

    // FIX: where() must come before orderBy()
    if (branchId) {
      q = adminDb
        .collection('products')
        .where('branchId', '==', branchId)
        .orderBy('createdAt', 'desc')
        .limit(limitCount);
    }

    if (lastId) {
      const lastDoc = await adminDb.collection('products').doc(lastId).get();
      if (!lastDoc.exists) {
        throw new ValidationError('Invalid lastId: document not found');
      }
      q = q.startAfter(lastDoc);
    }

    const snap = await q.get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    console.log('[Products API] Fetched products', {
      branchId: branchId || 'all',
      limit: limitCount,
      count: products.length,
      hasMore: products.length === limitCount,
    });

    return NextResponse.json(products, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
      },
    });
  } catch (err) {
    const appError = err instanceof Error ? handleFirebaseError(err) : formatErrorResponse(err);
    logError(err, {
      endpoint: '/api/products',
      method: 'GET',
    });

    return NextResponse.json(
      formatErrorResponse(err, process.env.NODE_ENV === 'development'),
      { status: appError.status || 500 }
    );
  }
}

/**
 * POST /api/products
 * Create new product with stock alert notifications
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      throw new AuthorizationError('Authentication required');
    }
    if (session.role !== 'admin') {
      throw new AuthorizationError('Admin role required');
    }

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

    // Validation
    if (!name || sellingPrice == null || buyingPrice == null || !branchId) {
      throw new ValidationError(
        'Missing required fields: name, sellingPrice, buyingPrice, branchId'
      );
    }

    if (typeof sellingPrice !== 'number' || sellingPrice < 0) {
      throw new ValidationError('sellingPrice must be a non-negative number');
    }

    if (typeof buyingPrice !== 'number' || buyingPrice < 0) {
      throw new ValidationError('buyingPrice must be a non-negative number');
    }

    const now = new Date().toISOString();
    const docRef = await adminDb.collection('products').add({
      name: String(name).trim(),
      description: description ? String(description).trim() : '',
      imageUrl: imageUrl ? String(imageUrl).trim() : '',
      sellingPrice: Number(sellingPrice),
      buyingPrice: Number(buyingPrice),
      reorder: Math.max(0, Number(reorder) || 0),
      stock: Math.max(0, Number(stock) || 0),
      branchId: String(branchId).trim(),
      category: category ? String(category).trim() : 'General',
      createdAt: now,
      updatedAt: now,
    });

    const stockVal = Math.max(0, Number(stock) || 0);
    const reorderVal = Math.max(1, Number(reorder) || 5);

    // Queue stock alert if needed (batched, not immediate)
    if (stockVal <= reorderVal) {
      const alertType = stockVal === 0 ? 'out-of-stock' : 'low-stock';
      const title = stockVal === 0 ? 'Out of Stock' : 'Low Stock Alert';
      const message = `${name} has been added with ${stockVal} units at branch ${branchId}`;

      try {
        await triggerBranchPush(branchId, docRef.id, {
          title,
          body: message,
          icon: '/favicon.png',
          badge: '/favicon.png',
          tag: stockVal === 0 ? 'danger' : 'warning',
          url: '/admin/products',
        });
      } catch (err) {
        console.error('[Product API] Failed to queue notification', err);
        // Don't fail the product creation if notification fails
      }
    }

    console.log('[Products API] Created product', {
      productId: docRef.id,
      name,
      branchId,
      stock: stockVal,
    });

    return NextResponse.json(
      { id: docRef.id, name, branchId },
      { status: 201 }
    );
  } catch (err) {
    const errorResponse = formatErrorResponse(err, process.env.NODE_ENV === 'development');
    logError(err, {
      endpoint: '/api/products',
      method: 'POST',
    });

    return NextResponse.json(errorResponse, {
      status: errorResponse.status,
    });
  }
}

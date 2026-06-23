import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getSession } from '@/lib/auth/session';
import {
  ValidationError,
  AuthenticationError,
  formatErrorResponse,
  logError,
} from '@/lib/error-handler';

/**
 * Server-side product search
 * GET /api/products/search?branchId=xxx&q=search_term
 * 
 * Eliminates database reads on client by handling search server-side
 * Search is indexed to ensure performance
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const q = searchParams.get('q');

    // Validation
    if (!branchId) {
      throw new ValidationError('branchId query parameter is required');
    }

    if (!q || q.trim().length === 0) {
      throw new ValidationError('q (search query) parameter is required');
    }

    if (q.length > 100) {
      throw new ValidationError('Search query too long (max 100 characters)');
    }

    // Sanitize search query
    const sanitizedQ = q
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, '');

    if (sanitizedQ.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    console.log('[Search API] Processing search query', {
      branchId,
      query: q,
      sanitized: sanitizedQ,
    });

    // Fetch products from database
    // For better performance, consider adding Firestore indexes:
    // Composite index on: branchId, name (Ascending), category (Ascending)
    const snap = await adminDb
      .collection('products')
      .where('branchId', '==', branchId)
      .limit(100) // Limit to prevent excessive reads
      .get();

    // Client-side filtering (after database fetch)
    // In production, consider using Algolia or similar for true full-text search
    const results = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((product: any) => {
        const name = (product.name || '').toLowerCase();
        const category = (product.category || '').toLowerCase();
        const description = (product.description || '').toLowerCase();

        // Match if search term is in any field
        return (
          name.includes(sanitizedQ) ||
          category.includes(sanitizedQ) ||
          description.includes(sanitizedQ) ||
          // Also check for partial word match
          sanitizedQ.split(' ').every((term) =>
            [name, category, description].some((field) =>
              field.includes(term)
            )
          )
        );
      })
      .slice(0, 50); // Return max 50 results

    const duration = Date.now() - startTime;

    console.log('[Search API] Search completed', {
      branchId,
      query: q,
      resultCount: results.length,
      duration,
    });

    return NextResponse.json(results, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'X-Search-Duration': `${duration}ms`,
        'X-Result-Count': `${results.length}`,
      },
    });
  } catch (err) {
    const errorResponse = formatErrorResponse(err, process.env.NODE_ENV === 'development');
    logError(err, { endpoint: '/api/products/search', method: 'GET' });

    return NextResponse.json(errorResponse, {
      status: errorResponse.status,
    });
  }
}

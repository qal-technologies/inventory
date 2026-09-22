import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { siteConfig } from '@/lib/site-config';

export function proxy(request: NextRequest) {
  if (!siteConfig.production) {
    if (request.nextUrl.pathname.startsWith('/api')) {
      return NextResponse.json(
        { error: 'Service Unavailable: Website is currently offline or undergoing maintenance.' },
        { status: 503 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};

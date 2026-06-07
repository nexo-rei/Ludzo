import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes don't need Telegram context check
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // API routes handled separately
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Static assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.includes('.')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'],
};

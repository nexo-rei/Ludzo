import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/language",
  "/auth",
  "/maintenance",
  "/api/auth/telegram",
  "/api/deposits/webhook",
  "/api/announcements",
  "/_next",
  "/favicon.ico",
  "/images",
];

const ADMIN_PATHS = ["/admin", "/api/admin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Admin paths handled by their own JWT auth
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API routes: auth checked within each handler
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

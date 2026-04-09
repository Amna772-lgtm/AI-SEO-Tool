import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow landing page (root) through unconditionally
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Allow public auth routes through unconditionally
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // Cookie presence check only — JWT signature verification happens server-side
  // in get_current_user() (defense in depth)
  const token = request.cookies.get("access_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except Next.js internals and the favicon
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

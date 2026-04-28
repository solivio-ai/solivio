import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_FILE = /\.(?:avif|gif|ico|jpg|jpeg|png|svg|txt|webmanifest|webp|xml)$/i;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/login") || PUBLIC_FILE.test(pathname)) return NextResponse.next();

  if (getSessionCookie(request)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};

import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_FILE = /\.[^/]+$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request));
  const isAuthApiRoute = pathname.startsWith("/api/auth");
  const isHealthRoute = pathname === "/api/health";
  const isApiRoute = pathname.startsWith("/api/");
  const isLoginRoute = pathname === "/login" || pathname.startsWith("/login/");
  const isPublicFile = PUBLIC_FILE.test(pathname);

  if (isApiRoute && !isAuthApiRoute && !isHealthRoute && !hasSessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isApiRoute && !isLoginRoute && !isPublicFile && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};

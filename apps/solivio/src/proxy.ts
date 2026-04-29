import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_FILE = /\.(?:avif|gif|ico|jpg|jpeg|png|svg|txt|webmanifest|webp|xml)$/i;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);
  const passthrough = NextResponse.next({ request: { headers } });

  if (pathname.startsWith("/login") || PUBLIC_FILE.test(pathname)) return passthrough;
  if (getSessionCookie(request)) return passthrough;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};

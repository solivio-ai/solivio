import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname);
  const passthrough = NextResponse.next({ request: { headers } });

  if (pathname.startsWith("/api/") && pathname !== "/api/health" && !getSessionCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return passthrough;
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};

import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import publicRoutes from "@/generated/public-routes.json";

const PUBLIC_FILE = /\.[^/]+$/;

/** "/offers/[offerId]" → /^\/offers\/[^/]+\/?$/ */
const toPattern = (route: string): RegExp =>
  new RegExp(`^${route.replaceAll(/\[[^/\]]+\]/g, "[^/]+")}/?$`);

const publicPagePatterns = publicRoutes.pages.map(toPattern);
const publicApiPatterns = publicRoutes.api.map(toPattern);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request));
  const isAuthApiRoute = pathname.startsWith("/api/auth");
  const isHealthRoute = pathname === "/api/health";
  const isApiRoute = pathname.startsWith("/api/");
  const isLoginRoute = pathname === "/login" || pathname.startsWith("/login/");
  const isPublicFile = PUBLIC_FILE.test(pathname);
  const isPublicModuleRoute = (isApiRoute ? publicApiPatterns : publicPagePatterns).some(
    (pattern) => pattern.test(pathname),
  );

  if (
    isApiRoute &&
    !isAuthApiRoute &&
    !isHealthRoute &&
    !isPublicModuleRoute &&
    !hasSessionCookie
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isApiRoute && !isLoginRoute && !isPublicFile && !isPublicModuleRoute && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};

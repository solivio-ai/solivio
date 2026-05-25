import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";

import type { Session } from "./auth";
import { auth } from "./auth";

export async function getCurrentSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export type RequireAuthResult =
  | { session: Session; response?: never }
  | { session?: never; response: NextResponse };

export async function requireAuth(): Promise<RequireAuthResult> {
  const session = await getCurrentSession();
  if (!session) return { response: unauthorized() };
  return { session };
}

export async function requireAdmin(): Promise<RequireAuthResult> {
  const result = await requireAuth();
  if (result.response) return result;
  if (!isAdmin(result.session.user))
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session: result.session };
}

/** For use in Server Component layouts and pages — throws a redirect instead of returning a response. */
export async function requireAdminPage(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.user)) notFound();
  return session;
}

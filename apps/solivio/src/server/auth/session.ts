import "server-only";

import { headers } from "next/headers";
import { NextResponse } from "next/server";

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
  if (result.session.user.role !== "admin")
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session: result.session };
}

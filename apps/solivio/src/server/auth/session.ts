import "server-only";

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth, type Session } from "./auth";

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

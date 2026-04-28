import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function requireAuth(): Promise<NextResponse | null> {
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

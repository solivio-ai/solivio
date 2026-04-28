import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function requireAuth(): Promise<NextResponse | null> {
  if (process.env.AUTH_ENABLED === "false") return null;

  const session = await auth.api.getSession({ headers: await headers() });
  if (session) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

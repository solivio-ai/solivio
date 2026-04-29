import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { errorResponseSchema } from "@/server/api/contracts";

export async function requireAuth(): Promise<NextResponse | null> {
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function requireAuthWithUser(): Promise<{ userId: string } | NextResponse> {
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "UNAUTHORIZED", message: "Authentication required." }
      }),
      { status: 401 }
    );
  }
  return { userId: session.user.id };
}

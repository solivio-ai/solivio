import { demoOffer } from "@solivio/domain";
import { NextResponse } from "next/server";

import { offerResponseSchema } from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  return NextResponse.json(offerResponseSchema.parse({
    offer: demoOffer
  }));
}

export async function POST() {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  return NextResponse.json(
    offerResponseSchema.parse({
      offer: {
        ...demoOffer,
        id: `offer-${Date.now()}`,
        status: "draft",
        generatedAt: new Date().toISOString()
      }
    }),
    { status: 201 }
  );
}

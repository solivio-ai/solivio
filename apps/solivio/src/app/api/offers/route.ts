import { demoOffer } from "@solivio/domain";
import { NextResponse } from "next/server";

import { offerResponseSchema } from "../../../server/api/contracts";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(offerResponseSchema.parse({
    offer: demoOffer
  }));
}

export function POST() {
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

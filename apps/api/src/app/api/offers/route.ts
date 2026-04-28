import { demoOffer } from "@solivio/domain";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    offer: demoOffer
  });
}

export function POST() {
  return NextResponse.json(
    {
      offer: {
        ...demoOffer,
        id: `offer-${Date.now()}`,
        status: "draft",
        generatedAt: new Date().toISOString()
      }
    },
    { status: 201 }
  );
}

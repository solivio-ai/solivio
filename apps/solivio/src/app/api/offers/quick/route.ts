import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/session";
import { createOffer } from "@/server/offers/offerService";
import type { GeneratedOffer } from "@/server/agents/offerGenerationAgent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const { items } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "items are required" } },
      { status: 400 }
    );
  }

  const generated: GeneratedOffer = {
    notes: ["Offer created manually from product search"],
    unmatched: [],
    items: items.map((i: any) => ({
      productId: i.productId,
      quantity: i.quantity,
      requestItem: "Manual Selection",
      rationale: "Selected by user",
    })),
  };

  const offer = await createOffer("Quick Offer", "Manual selection from catalog", generated);

  return NextResponse.json({ offer }, { status: 201 });
}

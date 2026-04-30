import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import type { GeneratedOffer } from "@/server/agents/offerGenerationAgent";
import { requireAuth } from "@/server/auth/session";
import { createOffer } from "@/server/offers/offerService";

export const runtime = "nodejs";

type QuickOfferItemInput = {
  productId: string;
  productName?: unknown;
  productSku?: unknown;
  quantity: number;
};

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const t = await getTranslations("QuickOffer");
  const body = (await request.json().catch(() => ({}))) as { items?: unknown };
  const items = Array.isArray(body.items) ? body.items : [];
  const validItems = items.filter(isQuickOfferItemInput);

  if (items.length === 0 || validItems.length !== items.length) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: t("errors.itemsRequired") } },
      { status: 400 },
    );
  }

  const generated: GeneratedOffer = {
    notes: [t("offer.note")],
    unmatched: [],
    items: validItems.map((i) => ({
      productId: i.productId,
      productName:
        typeof i.productName === "string" ? i.productName : t("offer.productNameFallback"),
      productSku: typeof i.productSku === "string" ? i.productSku : i.productId,
      quantity: i.quantity,
      requestItem: t("offer.requestItem"),
      rationale: t("offer.rationale"),
    })),
  };

  const offer = await createOffer(t("offer.title"), t("offer.description"), generated);

  return NextResponse.json({ offer }, { status: 201 });
}

function isQuickOfferItemInput(item: unknown): item is QuickOfferItemInput {
  if (!item || typeof item !== "object") return false;
  const value = item as Record<string, unknown>;
  return typeof value.productId === "string" && typeof value.quantity === "number";
}

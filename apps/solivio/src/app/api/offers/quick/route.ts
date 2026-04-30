import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/server/auth/session";
import { createOffer } from "@/server/offers/offerService";
import type { GeneratedOffer } from "@/server/agents/offerGenerationAgent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const t = await getTranslations("QuickOffer");
  const body = await request.json().catch(() => ({}));
  const { items } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: t("errors.itemsRequired") } },
      { status: 400 }
    );
  }

  const generated: GeneratedOffer = {
    notes: [t("offer.note")],
    unmatched: [],
    items: items.map((i: any) => ({
      productId: i.productId,
      productName: typeof i.productName === "string" ? i.productName : t("offer.productNameFallback"),
      productSku: typeof i.productSku === "string" ? i.productSku : i.productId,
      quantity: i.quantity,
      requestItem: t("offer.requestItem"),
      rationale: t("offer.rationale"),
    })),
  };

  const offer = await createOffer(t("offer.title"), t("offer.description"), generated);

  return NextResponse.json({ offer }, { status: 201 });
}

import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { CustomerSelectionError } from "@solivio/domain";
import type { GeneratedOffer } from "@/server/agents/offerGenerationAgent";
import { quickOfferRequestSchema } from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";
import { createOffer } from "@/server/offers/offerService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const t = await getTranslations("QuickOffer");
  const parsed = quickOfferRequestSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: t("errors.itemsRequired") } },
      { status: 400 },
    );
  }

  const { customerId, customerName, items } = parsed.data;

  if (!customerId && !customerName?.trim()) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: t("errors.customerNameRequired") } },
      { status: 400 },
    );
  }

  const generated: GeneratedOffer = {
    notes: [t("offer.note")],
    unmatched: [],
    items: items.map((i) => ({
      productId: i.productId,
      productName:
        typeof i.productName === "string" ? i.productName : t("offer.productNameFallback"),
      productSku: typeof i.productSku === "string" ? i.productSku : i.productId,
      quantity: i.quantity,
      requestItem: t("offer.requestItem"),
      rationale: t("offer.rationale"),
      matchSource: "manual" as const,
      matchScore: null,
    })),
  };

  try {
    const offer = await createOffer(
      customerName?.trim(),
      t("offer.description"),
      generated,
      auth.session.user.id,
      undefined,
      customerId,
    );

    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    if (error instanceof CustomerSelectionError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 400 },
      );
    }
    throw error;
  }
}

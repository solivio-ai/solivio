import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import type { GeneratedOffer } from "@/server/agents/offerGenerationAgent";
import { errorResponseSchema } from "@/server/api/schemas/common";
import { createdOfferResponseSchema, quickOfferRequestSchema } from "@/server/api/schemas/offer";
import { requireAuth } from "@/server/auth/session";
import { CustomerSelectionError } from "@/server/customers/customerRepository";
import { createOffer } from "@/server/offers/offerService";

export const runtime = "nodejs";

/**
 * Create a quick offer
 * @operationId createQuickOffer
 * @tag Offers
 * @auth sessionCookie
 * @bodyDescription Manual product selections to turn into a draft offer.
 * @body quickOfferRequestSchema
 * @response 201:createdOfferResponseSchema:A newly persisted manual offer.
 * @add 400:ErrorResponse:The request body was invalid or customer selection failed.
 * @openapi
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const t = await getTranslations("QuickOffer");
  const parsed = quickOfferRequestSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "VALIDATION_ERROR", message: t("errors.itemsRequired") },
      }),
      { status: 400 },
    );
  }

  const { customerId, customerName, items } = parsed.data;

  if (!customerId && !customerName?.trim()) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "VALIDATION_ERROR", message: t("errors.customerNameRequired") },
      }),
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

    return NextResponse.json(createdOfferResponseSchema.parse({ offer }), { status: 201 });
  } catch (error) {
    if (error instanceof CustomerSelectionError) {
      return NextResponse.json(
        errorResponseSchema.parse({ error: { code: error.code, message: error.message } }),
        { status: 400 },
      );
    }
    throw error;
  }
}

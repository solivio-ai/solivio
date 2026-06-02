import { NextResponse } from "next/server";

import { generateOfferWithAgent } from "@/server/agents/offerGenerationAgent";
import { generateOfferName } from "@/server/agents/offerNameAgent";
import { errorResponseSchema } from "@/server/api/schemas/common";
import { createdOfferResponseSchema, createOfferRequestSchema } from "@/server/api/schemas/offer";
import { requireAuth } from "@/server/auth/session";
import {
  CustomerSelectionError,
  customerNamesMatch,
  findCustomerById,
  normalizeCustomerName,
} from "@/server/customers/customerRepository";
import { saveOfferDraft } from "@/server/offers/offerDraftStore";
import { createOffer } from "@/server/offers/offerService";

export const runtime = "nodejs";
export const maxDuration = 300;

async function resolveCustomerNameForGeneration(
  customerId?: string | null,
  customerName?: string | null,
) {
  const normalizedName = customerName ? normalizeCustomerName(customerName) : undefined;
  if (!customerId) return normalizedName;

  const customer = await findCustomerById(customerId);
  if (!customer) {
    throw new CustomerSelectionError("customer_not_found", "Selected customer was not found.");
  }
  if (normalizedName && !customerNamesMatch(customer.name, normalizedName)) {
    throw new CustomerSelectionError(
      "customer_mismatch",
      "Selected customer does not match the provided customer name.",
    );
  }
  return customer.name;
}

function customerSelectionResponse(error: CustomerSelectionError) {
  return NextResponse.json(
    errorResponseSchema.parse({
      error: {
        code: error.code,
        message: error.message,
      },
    }),
    { status: 400 },
  );
}

/**
 * Generate a draft offer
 * @operationId generateOffer
 * @description AI-assisted offer generation backed by the products table.
 * @tag Offers
 * @auth sessionCookie
 * @bodyDescription Customer name and request text for the new offer.
 * @body createOfferRequestSchema
 * @response 201:createdOfferResponseSchema:A newly persisted draft offer.
 * @add 400:ErrorResponse:The request body was invalid or customer selection failed.
 * @add 500:ErrorResponse:Offer generation failed.
 * @openapi
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = createOfferRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "VALIDATION_ERROR", message: "clientRequest is required" },
      }),
      { status: 400 },
    );
  }

  const { customerId, customerName, clientRequest } = parsed.data;
  try {
    const resolvedCustomerName = await resolveCustomerNameForGeneration(customerId, customerName);
    const [generated, offerName] = await Promise.all([
      generateOfferWithAgent(clientRequest, resolvedCustomerName),
      generateOfferName(clientRequest, resolvedCustomerName),
    ]);
    const offer = await createOffer(
      resolvedCustomerName,
      clientRequest,
      generated,
      auth.session.user.id,
      offerName,
      customerId,
    );

    saveOfferDraft(offer);

    return NextResponse.json(createdOfferResponseSchema.parse({ offer }), { status: 201 });
  } catch (error) {
    if (error instanceof CustomerSelectionError) {
      return customerSelectionResponse(error);
    }

    console.error("[api/offers POST] generation failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "OFFER_GENERATION_FAILED",
          message: stack ? `${message}\n${stack}` : message,
        },
      }),
      { status: 500 },
    );
  }
}

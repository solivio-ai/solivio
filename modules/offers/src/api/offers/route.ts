import { NextResponse } from "next/server";

import { CustomerSelectionError, customerNamesMatch, normalizeCustomerName } from "@solivio/domain";
import { getAuth, getService } from "@solivio/sdk/runtime";

import { generateOfferWithAgent } from "../../ai/agents/offerGenerationAgent.ts";
import { generateOfferName } from "../../ai/agents/offerNameAgent.ts";
import { createOfferRequestSchema } from "../../contracts/index.ts";
import { saveOfferDraft } from "../../server/offerDraftStore.ts";
import { createOffer } from "../../server/offerService.ts";

export const runtime = "nodejs";
export const maxDuration = 300;

async function resolveCustomerNameForGeneration(
  customerId?: string | null,
  customerName?: string | null,
) {
  const normalizedName = customerName ? normalizeCustomerName(customerName) : undefined;
  if (!customerId) return normalizedName;

  const customer = await getService("customers").findById(customerId);
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
    {
      error: {
        code: error.code,
        message: error.message,
      },
    },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  const auth = await getAuth().requireAuth();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = createOfferRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "clientRequest is required" } },
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

    return NextResponse.json({ offer }, { status: 201 });
  } catch (error) {
    if (error instanceof CustomerSelectionError) {
      return customerSelectionResponse(error);
    }

    console.error("[api/offers POST] generation failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { error: { code: "OFFER_GENERATION_FAILED", message, stack } },
      { status: 500 },
    );
  }
}

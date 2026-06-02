import { NextResponse } from "next/server";
import type { z } from "zod";

import type { Offer } from "@solivio/domain";
import {
  errorResponseSchema,
  offerResponseSchema,
  updateOfferRequestSchema,
} from "@/server/api/schemas";
import { requireAuth } from "@/server/auth/session";
import { CustomerSelectionError } from "@/server/customers/customerRepository";
import { getOfferDraft, updateOfferDraft } from "@/server/offers/offerDraftStore";
import { deleteOffer, getOffer, updateOfferMeta } from "@/server/offers/offerService";

function asDraftPatch(data: z.infer<typeof updateOfferRequestSchema>) {
  return {
    status: data.status,
    name: data.name,
    customerId: data.customerId,
    customerName: data.customerName,
    unmatched: data.unmatched,
    discountPercent: data.discountPercent,
    discountAmount: data.discountAmount,
  };
}

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    offerId: string;
  }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Get an offer
 * @operationId getOffer
 * @tag Offers
 * @auth sessionCookie
 * @pathParams offerPathParamsSchema
 * @response 200:offerResponseSchema:The requested offer.
 * @add 404:ErrorResponse:The offer was not found.
 * @openapi
 */
export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;

  const offer = isUuid(offerId)
    ? ((await getOffer(offerId)) ?? getOfferDraft(offerId))
    : getOfferDraft(offerId);

  if (!offer) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "offer_not_found",
          message: `Offer '${offerId}' was not found.`,
        },
      }),
      { status: 404 },
    );
  }

  return NextResponse.json(offerResponseSchema.parse({ offer }));
}

/**
 * Update an offer
 * @operationId updateOffer
 * @tag Offers
 * @auth sessionCookie
 * @pathParams offerPathParamsSchema
 * @bodyDescription Review edits to apply to the offer.
 * @body updateOfferRequestSchema
 * @response 200:offerResponseSchema:The updated offer.
 * @add 400:ErrorResponse:The request body was invalid.
 * @add 403:ErrorResponse:The offer is locked.
 * @add 404:ErrorResponse:The offer was not found.
 * @openapi
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const input = updateOfferRequestSchema.safeParse(await request.json().catch(() => ({})));

  if (!input.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "invalid_request",
          message: "Request body must match the offer update contract.",
          issues: input.error.issues.map((issue) => issue.message),
        },
      }),
      { status: 400 },
    );
  }

  const hasPersistedPatch =
    input.data.status !== undefined ||
    input.data.name !== undefined ||
    input.data.customerId !== undefined ||
    input.data.customerName !== undefined ||
    input.data.discountPercent !== undefined ||
    input.data.discountAmount !== undefined ||
    input.data.unmatched !== undefined ||
    input.data.notes !== undefined ||
    input.data.currency !== undefined;

  let offer: Offer | null;
  try {
    offer =
      isUuid(offerId) && hasPersistedPatch
        ? await updateOfferMeta(
            offerId,
            {
              status: input.data.status,
              name: input.data.name,
              customerId: input.data.customerId,
              customerName: input.data.customerName,
              currency: input.data.currency,
              discountPercent: input.data.discountPercent,
              discountAmount: input.data.discountAmount,
              notes: input.data.notes,
              unmatched: input.data.unmatched,
            },
            auth.session.user.id,
          )
        : updateOfferDraft(offerId, asDraftPatch(input.data));
  } catch (error) {
    if (error instanceof CustomerSelectionError) {
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
    throw error;
  }

  if (!offer) {
    const existing = isUuid(offerId) ? await getOffer(offerId) : null;
    if (existing?.status === "accepted") {
      return NextResponse.json(
        errorResponseSchema.parse({
          error: {
            code: "offer_locked",
            message: "This offer has been accepted and cannot be modified.",
          },
        }),
        { status: 403 },
      );
    }

    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "offer_not_found",
          message: `Offer '${offerId}' was not found.`,
        },
      }),
      { status: 404 },
    );
  }

  return NextResponse.json(offerResponseSchema.parse({ offer }));
}

/**
 * Delete an offer
 * @operationId deleteOffer
 * @tag Offers
 * @auth sessionCookie
 * @pathParams offerPathParamsSchema
 * @response 204
 * @responseDescription The offer was deleted.
 * @add 404:ErrorResponse:The offer was not found.
 * @openapi
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;

  if (!isUuid(offerId)) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "offer_not_found",
          message: `Offer '${offerId}' was not found.`,
        },
      }),
      { status: 404 },
    );
  }

  const deleted = await deleteOffer(offerId);
  if (!deleted) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "offer_not_found",
          message: `Offer '${offerId}' was not found.`,
        },
      }),
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}

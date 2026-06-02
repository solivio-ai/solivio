import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import type { ReactElement } from "react";
import { z } from "zod";

import { buildPdfOfferPayload, OfferDocument } from "@/features/offer-pdf";
import { errorResponseSchema } from "@/server/api/schemas/common";
import { requireAuth } from "@/server/auth/session";
import { getOffer } from "@/server/offers/offerService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    offerId: string;
  }>;
};

const offerPdfQuerySchema = z
  .object({
    download: z.enum(["1"]).optional(),
  })
  .strict()
  .meta({
    id: "OfferPdfQuery",
    description: "Set download=1 to return the PDF as an attachment.",
  });

function toPdfResponse(buffer: Buffer, filename: string, asAttachment = false) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${asAttachment ? "attachment" : "inline"}; filename="${filename}"`,
    },
  });
}

/**
 * Render persisted offer PDF
 * @operationId getOfferPdf
 * @tag Documents
 * @auth sessionCookie
 * @pathParams offerPathParamsSchema
 * @queryParams offerPdfQuerySchema
 * @responseContentType application/pdf
 * @response 200:string:The rendered PDF for the persisted offer.
 * @add 400:ErrorResponse:The PDF query parameters were invalid.
 * @add 404:ErrorResponse:The offer was not found.
 * @openapi
 */
export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const query = offerPdfQuerySchema.safeParse({
    download: new URL(request.url).searchParams.get("download") ?? undefined,
  });
  if (!query.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "invalid_query",
          message: "PDF query parameters are invalid.",
          issues: query.error.issues.map((issue) => issue.message),
        },
      }),
      { status: 400 },
    );
  }

  const offer = await getOffer(offerId);

  if (!offer) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "OFFER_NOT_FOUND", message: `Offer '${offerId}' was not found.` },
      }),
      { status: 404 },
    );
  }

  const payload = buildPdfOfferPayload(offer);
  const buffer = await renderToBuffer(
    (<OfferDocument data={payload} />) as ReactElement<DocumentProps>,
  );

  const asAttachment = query.data.download === "1";
  const filename = `oferta-${payload.offer.number.replace(/\//g, "-")}.pdf`;
  return toPdfResponse(buffer, filename, asAttachment);
}

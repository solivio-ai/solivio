import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import type { ReactElement } from "react";

import { buildPdfOfferPayload, OfferDocument } from "@/features/offer-pdf";
import { requireAuth } from "@/server/auth/session";
import { getOffer } from "@/server/offers/offerService";

import { errorResponseSchema, offerPdfQuerySchema } from "./openapi";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    offerId: string;
  }>;
};

function toPdfResponse(buffer: Buffer, filename: string, asAttachment = false) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${asAttachment ? "attachment" : "inline"}; filename="${filename}"`,
    },
  });
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
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

  const asAttachment = query.data.download === "1";
  const filename = `oferta-${payload.offer.number.replace(/\//g, "-")}.pdf`;
  return toPdfResponse(buffer, filename, asAttachment);
}

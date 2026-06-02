import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import type { ReactElement } from "react";

import { errorResponseSchema, offerPdfRequestSchema } from "@/server/api/schemas";

import { OfferDocument, sampleOffer } from "../../../../features/offer-pdf";

export const runtime = "nodejs";

function toResponse(buffer: Buffer, filename: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}

/**
 * Render sample offer PDF
 * @operationId getSampleOfferPdf
 * @tag Documents
 * @responseContentType application/pdf
 * @response 200:string:A sample offer PDF.
 * @openapi
 */
export async function GET() {
  const buffer = await renderToBuffer(
    (<OfferDocument data={sampleOffer} />) as ReactElement<DocumentProps>,
  );
  return toResponse(buffer, `oferta-${sampleOffer.offer.number}.pdf`);
}

/**
 * Render offer PDF from payload
 * @operationId renderOfferPdf
 * @tag Documents
 * @bodyDescription Offer document payload to render.
 * @body offerPdfRequestSchema
 * @responseContentType application/pdf
 * @response 200:string:The rendered offer PDF.
 * @add 400:ErrorResponse:The PDF payload was invalid.
 * @openapi
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: { code: "INVALID_JSON", message: "Request body is not valid JSON." },
      }),
      { status: 400 },
    );
  }

  const parsed = offerPdfRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid offer data.",
          issues: parsed.error.issues.map((i) => i.message),
        },
      }),
      { status: 400 },
    );
  }

  const buffer = await renderToBuffer(
    (<OfferDocument data={parsed.data} />) as ReactElement<DocumentProps>,
  );
  const filename = `oferta-${parsed.data.offer.number.replace(/\//g, "-")}.pdf`;
  return toResponse(buffer, filename);
}

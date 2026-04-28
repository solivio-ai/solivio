import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { NextResponse } from "next/server";

import { OfferDocument, pdfOfferRequestSchema, sampleOffer } from "../../../../features/offer-pdf";

export const runtime = "nodejs";

function toResponse(buffer: Buffer, filename: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}

export async function GET() {
  const buffer = await renderToBuffer(
    <OfferDocument data={sampleOffer} /> as ReactElement<DocumentProps>
  );
  return toResponse(buffer, `oferta-${sampleOffer.offer.number}.pdf`);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body is not valid JSON." } },
      { status: 400 }
    );
  }

  const parsed = pdfOfferRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid offer data.",
          issues: parsed.error.issues.map((i) => i.message),
        },
      },
      { status: 400 }
    );
  }

  const buffer = await renderToBuffer(
    <OfferDocument data={parsed.data} /> as ReactElement<DocumentProps>
  );
  const filename = `oferta-${parsed.data.offer.number.replace(/\//g, "-")}.pdf`;
  return toResponse(buffer, filename);
}

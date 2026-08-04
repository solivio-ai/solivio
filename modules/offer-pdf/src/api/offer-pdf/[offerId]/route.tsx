import { NextResponse } from "next/server";

// Type-only: pulls the offers module's `Services` augmentation into this
// typecheck so `getService("offers")` is typed. Erased at runtime.
import type {} from "@solivio/module-offers/services.ts";
import { getAuth, getService } from "@solivio/sdk/runtime";

import { renderOfferPdf } from "../../../lib/renderOfferPdf.ts";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    offerId: string;
  }>;
};

/**
 * Renders a finalized offer as a PDF.
 *
 * This module owns the route because it owns the rendering — a channel is a
 * declaration the deployment binds, not something the core calls. The offers
 * module hosts the slots this module fills; it knows nothing about PDFs.
 *
 * The offer is loaded here by id and never accepted from the request body, even
 * though the slot component that links here already holds it client-side. Slot
 * props are editable in the browser; a route that trusted them would render (and
 * for another destination, transmit) whatever the caller made up.
 */
export async function GET(request: Request, context: RouteContext) {
  const auth = await getAuth().requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const offer = await getService("offers").getOffer(offerId);

  if (!offer) {
    return NextResponse.json(
      { error: { code: "OFFER_NOT_FOUND", message: `Offer '${offerId}' was not found.` } },
      { status: 404 },
    );
  }

  const { body, contentType, filename } = await renderOfferPdf(offer);
  const asAttachment = new URL(request.url).searchParams.get("download") === "1";

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${asAttachment ? "attachment" : "inline"}; filename="${filename}"`,
    },
  });
}

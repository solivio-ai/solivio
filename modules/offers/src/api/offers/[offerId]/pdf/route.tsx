import { NextResponse } from "next/server";

import { getAuth, getChannel } from "@solivio/sdk/runtime";

import { getOffer } from "../../../../server/offerService.ts";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    offerId: string;
  }>;
};

function toDocumentResponse(
  body: Uint8Array<ArrayBuffer>,
  contentType: string,
  filename: string,
  asAttachment = false,
) {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${asAttachment ? "attachment" : "inline"}; filename="${filename}"`,
    },
  });
}

/**
 * Serves the document produced by the configured `offer` channel.
 *
 * The offers module owns this URL but not the rendering: which channel runs is a
 * deployment decision (`"offer.channel"` in solivio.config.ts). A channel whose
 * result is not a document — an ERP push, an email send — has nothing to return
 * here, which is a misconfiguration rather than a bad request.
 */
export async function GET(request: Request, context: RouteContext) {
  const auth = await getAuth().requireAuth();
  if (auth.response) return auth.response;

  const { offerId } = await context.params;
  const offer = await getOffer(offerId);

  if (!offer) {
    return NextResponse.json(
      { error: { code: "OFFER_NOT_FOUND", message: `Offer '${offerId}' was not found.` } },
      { status: 404 },
    );
  }

  const channel = await getChannel("offer");
  const result = await channel.run({ offer });

  if (result.kind !== "document") {
    return NextResponse.json(
      {
        error: {
          code: "CHANNEL_HAS_NO_DOCUMENT",
          message: `The configured offer channel "${channel.name}" produces "${result.kind}", not a document.`,
        },
      },
      { status: 500 },
    );
  }

  const asAttachment = new URL(request.url).searchParams.get("download") === "1";
  return toDocumentResponse(result.body, result.contentType, result.filename, asAttachment);
}

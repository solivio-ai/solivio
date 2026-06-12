import { NextResponse } from "next/server";

import type { ProductInput } from "@solivio/sdk";
import { getAuth, getImporter } from "@solivio/sdk/runtime";

import { importProductsWithEmbeddings } from "../../../server/productEmbeddingService.ts";

export const runtime = "nodejs";
/** Headroom for slow OpenAI embedding round-trips on large catalogs. */
export const maxDuration = 300;

/** ~25 MB — fits large catalogs while blocking runaway payloads. */
const MAX_BODY_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const { response: authResponse } = await getAuth().requireAdmin();
  if (authResponse) return authResponse;

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: `Request body must not exceed ${MAX_BODY_BYTES / 1024 / 1024} MB.` },
      { status: 413 },
    );
  }

  try {
    const body = await request.json();

    const content = body?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Body must include a non-empty 'content' string." },
        { status: 400 },
      );
    }

    if (Buffer.byteLength(content, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: `Content must not exceed ${MAX_BODY_BYTES / 1024 / 1024} MB.` },
        { status: 413 },
      );
    }

    const importer = await getImporter("product");
    const result = await importer.run(content);

    if (result.status === "failed") {
      return NextResponse.json({ error: "Import failed.", errors: result.errors }, { status: 400 });
    }

    // The "product" importer slot contract guarantees ProductInput records.
    const { count } = await importProductsWithEmbeddings(result.records as ProductInput[]);

    return NextResponse.json({ count, errors: result.errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

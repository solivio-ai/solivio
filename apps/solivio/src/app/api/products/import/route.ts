import { NextResponse } from "next/server";

import { requireAuth } from "@/server/auth/session";
import { getImporter } from "@/server/modules/registry";
import { getDefaultEmbeddingModel } from "@/server/products/embeddingConfig";
import { importProductsWithEmbeddings } from "@/server/products/productEmbeddingService";

export const runtime = "nodejs";
/** Headroom for slow OpenAI embedding round-trips on large catalogs. */
export const maxDuration = 300;

/** ~25 MB — fits large catalogs while blocking runaway payloads. */
const MAX_BODY_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

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

    const model = getDefaultEmbeddingModel();

    const importer = await getImporter();
    const result = await importer.run(content);

    if (result.status === "failed") {
      return NextResponse.json({ error: "Import failed.", errors: result.errors }, { status: 400 });
    }

    const { count } = await importProductsWithEmbeddings(result.records, model);

    return NextResponse.json({ count, errors: result.errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

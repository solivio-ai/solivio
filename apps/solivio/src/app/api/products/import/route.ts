import { NextResponse } from "next/server";
import { z } from "zod";

import { plainErrorResponseSchema } from "@/server/api/schemas/common";
import { requireAdmin } from "@/server/auth/session";
import { getImporter } from "@/server/modules/registry";
import { getDefaultEmbeddingModel } from "@/server/products/embeddingConfig";
import { importProductsWithEmbeddings } from "@/server/products/productEmbeddingService";

export const runtime = "nodejs";
/** Headroom for slow OpenAI embedding round-trips on large catalogs. */
export const maxDuration = 300;

/** ~25 MB — fits large catalogs while blocking runaway payloads. */
const MAX_BODY_BYTES = 25 * 1024 * 1024;

const productImportRequestSchema = z
  .object({
    content: z.string().min(1),
  })
  .strict()
  .meta({
    id: "ProductImportRequest",
    description: "CSV file contents for product import.",
  });

const productImportRowErrorSchema = z
  .object({
    index: z.number().int().nonnegative().optional(),
    sku: z.string().optional(),
    message: z.string(),
  })
  .strict()
  .meta({ id: "ProductImportRowError" });

const productImportResponseSchema = z
  .object({
    count: z.number().int().nonnegative(),
    errors: z.array(productImportRowErrorSchema),
  })
  .strict()
  .meta({ id: "ProductImportResponse" });

const productImportErrorResponseSchema = z
  .object({
    error: z.string(),
    errors: z.array(productImportRowErrorSchema).optional(),
  })
  .strict()
  .meta({ id: "ProductImportErrorResponse" });

/**
 * Import products with embeddings
 * @operationId importProducts
 * @description Admin only. Requires an authenticated session with the admin role.
 * @tag Products
 * @auth sessionCookie
 * @bodyDescription CSV file contents to parse, embed, and upsert.
 * @body productImportRequestSchema
 * @response 200:productImportResponseSchema:Number of products imported.
 * @add 400:productImportErrorResponseSchema:The import body was invalid.
 * @add 403:PlainErrorResponse:The current session is not allowed to import products.
 * @add 413:PlainErrorResponse:The import payload exceeded the allowed size.
 * @add 500:productImportErrorResponseSchema:The import failed while embedding or writing products.
 * @openapi
 */
export async function POST(request: Request) {
  const { response: authResponse } = await requireAdmin();
  if (authResponse) return authResponse;

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json(
      plainErrorResponseSchema.parse({
        error: `Request body must not exceed ${MAX_BODY_BYTES / 1024 / 1024} MB.`,
      }),
      { status: 413 },
    );
  }

  try {
    const body = productImportRequestSchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json(
        productImportErrorResponseSchema.parse({
          error: "Body must include a non-empty 'content' string.",
        }),
        { status: 400 },
      );
    }

    const { content } = body.data;
    if (Buffer.byteLength(content, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json(
        plainErrorResponseSchema.parse({
          error: `Content must not exceed ${MAX_BODY_BYTES / 1024 / 1024} MB.`,
        }),
        { status: 413 },
      );
    }

    const model = getDefaultEmbeddingModel();

    const importer = await getImporter("product");
    const result = await importer.run(content);

    if (result.status === "failed") {
      return NextResponse.json(
        productImportErrorResponseSchema.parse({
          error: "Import failed.",
          errors: result.errors,
        }),
        { status: 400 },
      );
    }

    const { count } = await importProductsWithEmbeddings(result.records, model);

    return NextResponse.json(productImportResponseSchema.parse({ count, errors: result.errors }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(productImportErrorResponseSchema.parse({ error: message }), {
      status: 500,
    });
  }
}

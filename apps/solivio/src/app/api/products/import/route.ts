import { NextResponse } from "next/server";

import type { ProductImportRow } from "@solivio/domain";

import { requireAdmin } from "../../../../server/auth/session";
import { getDefaultEmbeddingModel } from "../../../../server/products/embeddingConfig";
import type { EmbeddingModelId } from "../../../../server/products/embeddingModels";
import { EMBEDDING_MODELS } from "../../../../server/products/embeddingModels";
import { importProductsWithEmbeddings } from "../../../../server/products/productEmbeddingService";

export const runtime = "nodejs";
/** Headroom for slow OpenAI embedding round-trips on the largest allowed batch. */
export const maxDuration = 300;

const VALID_MODEL_IDS = new Set<string>(EMBEDDING_MODELS.map((m) => m.id));
const STRING_FIELDS = ["sku", "name", "description", "currency"] as const;
const NUMBER_FIELDS = ["priceNet", "priceGross", "vatRate"] as const;
/** Per-request cap. Aligns with the client chunk size; clients must split larger catalogs. */
const MAX_ROWS_PER_REQUEST = 1000;

function normalize(raw: unknown): ProductImportRow | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const result: Partial<ProductImportRow> = {};
  for (const field of STRING_FIELDS) {
    const value = record[field];
    if (typeof value !== "string" || value.trim().length === 0) return null;
    result[field] = field === "currency" ? value.trim().toUpperCase() : value.trim();
  }
  for (const field of NUMBER_FIELDS) {
    const value = record[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
    result[field] = value;
  }
  return result as ProductImportRow;
}

export async function POST(request: Request) {
  const { response: authResponse } = await requireAdmin();
  if (authResponse) return authResponse;

  try {
    const body = await request.json();

    const rawList = Array.isArray(body?.products) ? body.products : null;
    if (!rawList || rawList.length === 0) {
      return NextResponse.json(
        { error: "Body must include a non-empty 'products' array." },
        { status: 400 },
      );
    }

    if (rawList.length > MAX_ROWS_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `Too many products in one request (${rawList.length}). Send at most ${MAX_ROWS_PER_REQUEST} per request.`,
        },
        { status: 413 },
      );
    }

    const rawModel = body?.model;
    if (rawModel !== undefined && !VALID_MODEL_IDS.has(rawModel)) {
      return NextResponse.json(
        { error: `Unknown model '${rawModel}'. Valid: ${[...VALID_MODEL_IDS].join(", ")}.` },
        { status: 400 },
      );
    }
    const model = (rawModel ?? getDefaultEmbeddingModel()) as EmbeddingModelId;

    const rows: ProductImportRow[] = [];
    for (const item of rawList) {
      const row = normalize(item);
      if (!row) {
        return NextResponse.json(
          {
            error:
              "Each product needs sku, name, description, priceNet, priceGross, vatRate and currency.",
          },
          { status: 400 },
        );
      }
      rows.push(row);
    }

    const result = await importProductsWithEmbeddings(rows, model);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

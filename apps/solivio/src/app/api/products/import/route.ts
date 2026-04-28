import type { ProductImportRow } from "@solivio/domain";
import { NextResponse } from "next/server";
import {
  EMBEDDING_MODELS,
  type EmbeddingModelId
} from "../../../../server/products/embeddingModels";
import { importProductsWithEmbeddings } from "../../../../server/products/productEmbeddingService";

export const runtime = "nodejs";

const VALID_MODEL_IDS = new Set<string>(EMBEDDING_MODELS.map((m) => m.id));
const REQUIRED_FIELDS: (keyof ProductImportRow)[] = [
  "sku",
  "name",
  "description",
  "manufacturer"
];

function normalize(raw: unknown): ProductImportRow | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const result: Partial<ProductImportRow> = {};
  for (const field of REQUIRED_FIELDS) {
    const value = record[field];
    if (typeof value !== "string" || value.trim().length === 0) return null;
    result[field] = value.trim();
  }
  return result as ProductImportRow;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const rawList = Array.isArray(body?.products) ? body.products : null;
    if (!rawList || rawList.length === 0) {
      return NextResponse.json(
        { error: "Body must include a non-empty 'products' array." },
        { status: 400 }
      );
    }

    const rawModel = body?.model;
    if (rawModel !== undefined && !VALID_MODEL_IDS.has(rawModel)) {
      return NextResponse.json(
        { error: `Unknown model '${rawModel}'. Valid: ${[...VALID_MODEL_IDS].join(", ")}.` },
        { status: 400 }
      );
    }
    const model = (rawModel ?? "text-embedding-3-small") as EmbeddingModelId;

    const rows: ProductImportRow[] = [];
    for (const item of rawList) {
      const row = normalize(item);
      if (!row) {
        return NextResponse.json(
          { error: "Each product needs sku, name, description and manufacturer." },
          { status: 400 }
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

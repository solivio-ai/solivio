import { NextResponse } from "next/server";
import { EMBEDDING_MODELS } from "../../../server/products/embeddingModels";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ models: EMBEDDING_MODELS });
}

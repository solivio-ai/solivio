import "server-only";

import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { desc, sql } from "drizzle-orm";

import { db } from "../database/db";
import { products } from "../database/schema";
import type { EmbeddingModelId } from "./embeddingModels";

export type ProductSearchMatch = {
  id: string;
  sku: string;
  name: string;
  description: string;
  manufacturer: string;
  nameSimilarity: number;
  descriptionSimilarity: number;
  similarity: number;
};

type SearchProductsOptions = {
  limit?: number;
  minSimilarity?: number;
  model?: EmbeddingModelId;
};

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const DEFAULT_MIN_SIMILARITY = 0.1;

function clampLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)));
}

function roundScore(value: number) {
  return Number(value.toFixed(4));
}

export async function searchProductsByPrompt(
  prompt: string,
  options: SearchProductsOptions = {}
): Promise<ProductSearchMatch[]> {
  const normalizedPrompt = prompt.trim();
  if (normalizedPrompt.length === 0) return [];

  const { embedding } = await embed({
    model: openai.embedding(options.model ?? "text-embedding-3-small"),
    value: normalizedPrompt
  });

  const vector = `[${embedding.join(",")}]`;
  const nameSimilarity = sql<number>`1 - (${products.nameEmbedding} <=> ${vector}::vector)`;
  const descriptionSimilarity =
    sql<number>`1 - (${products.descriptionEmbedding} <=> ${vector}::vector)`;
  const similarity =
    sql<number>`(${nameSimilarity} * 0.35) + (${descriptionSimilarity} * 0.65)`;

  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      manufacturer: products.manufacturer,
      nameSimilarity,
      descriptionSimilarity,
      similarity
    })
    .from(products)
    .orderBy(desc(similarity))
    .limit(clampLimit(options.limit));

  return rows
    .map((row) => ({
      ...row,
      nameSimilarity: roundScore(row.nameSimilarity),
      descriptionSimilarity: roundScore(row.descriptionSimilarity),
      similarity: roundScore(row.similarity)
    }))
    .filter((row) => row.similarity >= (options.minSimilarity ?? DEFAULT_MIN_SIMILARITY));
}

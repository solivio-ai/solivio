import "server-only";

import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { type AnyColumn, desc, sql } from "drizzle-orm";

import { db } from "../database/db";
import { products } from "../database/schema";
import type { EmbeddingModelId } from "./embeddingModels";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ProductSearchMatch = {
  id: string;
  sku: string;
  name: string;
  description: string;
  manufacturer: string;
  priceNet: number | null;
  currency: string | null;
  nameSimilarity: number;
  descriptionSimilarity: number;
  similarity: number;
};

type SearchProductsOptions = {
  limit?: number;
  minSimilarity?: number;
  model?: EmbeddingModelId;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const DEFAULT_MIN_SIMILARITY = 0.7;

// Description carries more semantic signal than the name alone.
const NAME_WEIGHT = 0.35;
const DESCRIPTION_WEIGHT = 0.65;

// ── Helpers ────────────────────────────────────────────────────────────────────

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)));
}

function roundScore(value: number): number {
  return Number(Math.min(1, Math.max(-1, value)).toFixed(4));
}

// pgvector expects the vector as a string literal: '[0.1, 0.2, ...]'
function toPostgresVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

// <=> is the pgvector cosine distance operator (0 = identical, 1 = opposite).
// We subtract from 1 to turn distance into similarity (1 = identical, 0 = opposite).
function cosineSimilarity(column: AnyColumn, vector: string) {
  return sql<number>`1 - (${column} <=> ${vector}::vector)`;
}

// ── Search ─────────────────────────────────────────────────────────────────────

export async function searchProductsByPrompt(
  prompt: string,
  options: SearchProductsOptions = {}
): Promise<ProductSearchMatch[]> {
  if (prompt.trim().length === 0) return [];

  // Step 1: Turn the prompt into a vector using the same model used at import time.
  const { embedding } = await embed({
    model: openai.embedding(options.model ?? "text-embedding-3-small"),
    value: prompt.trim()
  });

  // Step 2: Build SQL expressions for similarity against each embedded column.
  const pgVector = toPostgresVector(embedding);
  const nameSimilarity = cosineSimilarity(products.nameEmbedding, pgVector);
  const descriptionSimilarity = cosineSimilarity(products.descriptionEmbedding, pgVector);
  const weightedSimilarity = sql<number>`
    (${nameSimilarity} * ${NAME_WEIGHT}) + (${descriptionSimilarity} * ${DESCRIPTION_WEIGHT})
  `;

  // Step 3: Fetch the top N most similar products, ordered by weighted score.
  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      manufacturer: products.manufacturer,
      priceNet: products.priceNet,
      currency: products.currency,
      nameSimilarity,
      descriptionSimilarity,
      similarity: weightedSimilarity
    })
    .from(products)
    .orderBy(desc(weightedSimilarity))
    .limit(clampLimit(options.limit));

  // Step 4: Round scores and drop results that are below the similarity threshold.
  const minSimilarity = options.minSimilarity ?? DEFAULT_MIN_SIMILARITY;

  return rows
    .map((row) => ({
      ...row,
      nameSimilarity: roundScore(row.nameSimilarity),
      descriptionSimilarity: roundScore(row.descriptionSimilarity),
      similarity: roundScore(row.similarity)
    }))
    .filter((row) => row.similarity >= minSimilarity);
}

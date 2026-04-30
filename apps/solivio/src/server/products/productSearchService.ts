import "server-only";

import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import type { AnyColumn } from "drizzle-orm";
import { desc, inArray, sql } from "drizzle-orm";

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
  options: SearchProductsOptions = {},
): Promise<ProductSearchMatch[]> {
  if (prompt.trim().length === 0) return [];

  const { embedding } = await embed({
    model: openai.embedding(options.model ?? "text-embedding-3-small"),
    value: prompt.trim(),
  });

  const pgVector = toPostgresVector(embedding);
  const similarity = cosineSimilarity(products.combinedEmbedding, pgVector);
  const minSimilarity = options.minSimilarity ?? DEFAULT_MIN_SIMILARITY;

  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      manufacturer: products.manufacturer,
      priceNet: products.priceNet,
      currency: products.currency,
      similarity,
    })
    .from(products)
    .orderBy(desc(similarity))
    .limit(clampLimit(options.limit));

  return rows
    .map((row) => ({ ...row, similarity: roundScore(row.similarity) }))
    .filter((row) => row.similarity >= minSimilarity);
}

// Exact SKU lookup. Identifiers belong in B-tree, not in vector space.
export async function lookupProductsBySkus(
  skus: string[],
): Promise<Map<string, ProductSearchMatch>> {
  const trimmed = skus.map((s) => s.trim()).filter((s) => s.length > 0);
  if (trimmed.length === 0) return new Map();

  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      manufacturer: products.manufacturer,
      priceNet: products.priceNet,
      currency: products.currency,
    })
    .from(products)
    .where(inArray(products.sku, trimmed));

  return new Map(rows.map((row) => [row.sku, { ...row, similarity: 1 }]));
}

export async function searchProductsBatch(
  prompts: string[],
  options: SearchProductsOptions = {},
): Promise<Map<string, ProductSearchMatch[]>> {
  const nonEmpty = prompts.filter((p) => p.trim().length > 0);
  if (nonEmpty.length === 0) return new Map();

  const { embeddings } = await embedMany({
    model: openai.embedding(options.model ?? "text-embedding-3-small"),
    values: nonEmpty.map((p) => p.trim()),
  });

  const minSimilarity = options.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  const limit = clampLimit(options.limit);

  const entries = await Promise.all(
    embeddings.map(async (embedding, i) => {
      const pgVector = toPostgresVector(embedding);
      const similarity = cosineSimilarity(products.combinedEmbedding, pgVector);

      const rows = await db
        .select({
          id: products.id,
          sku: products.sku,
          name: products.name,
          description: products.description,
          manufacturer: products.manufacturer,
          priceNet: products.priceNet,
          currency: products.currency,
          similarity,
        })
        .from(products)
        .orderBy(desc(similarity))
        .limit(limit);

      const matches = rows
        .map((row) => ({ ...row, similarity: roundScore(row.similarity) }))
        .filter((row) => row.similarity >= minSimilarity);

      return [nonEmpty[i]!, matches] as const;
    }),
  );

  return new Map(entries);
}

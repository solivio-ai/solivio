import type { BenchmarkCase } from "./types";

// Structural subset of GeneratedOffer (apps/solivio/src/server/agents/offerGenerationAgent.ts).
// Kept structural so this module stays importable without the server-only agent code.
export type GeneratedOfferLike = {
  items: Array<{ productSku: string; quantity: number }>;
  unmatched: string[];
};

export type ItemVerdict = {
  expectedSku: string;
  expectedQuantity: number;
  matchedSku: string | null;
  generatedQuantity: number | null;
  credit: number; // 1.0 sku+qty, 0.5 sku only, 0 missing
};

export type CaseScore = {
  score: number; // headline per-case score in [0, 1]
  itemF1: number;
  itemRecall: number;
  itemPrecision: number;
  unmatchedRecall: number | null; // null when the case expects no unmatched items
  verdicts: ItemVerdict[];
  extraSkus: string[]; // generated items not expected — hallucinations or wrong picks
  missedUnmatched: string[]; // expected-unmatched fragments the agent did not report
};

const significantTokens = (s: string): Set<string> =>
  new Set(
    s
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length >= 3),
  );

const fragmentsOverlap = (a: string, b: string): boolean => {
  const ta = significantTokens(a);
  const tb = significantTokens(b);
  for (const t of ta) if (tb.has(t)) return true;
  return false;
};

/**
 * Deterministic score for one generated offer against a case's expected offer.
 *
 * - Each expected item earns 1.0 (right SKU, right quantity), 0.5 (right SKU,
 *   wrong quantity) or 0 (missing). `altSkus` count as the right SKU.
 * - recall = credit / |expected|, precision = credit / |generated|; itemF1 is
 *   their harmonic mean, so hallucinated extra items lower the score.
 * - Expected-unmatched fragments must appear in the agent's `unmatched` list
 *   (token-overlap match); their recall is averaged in, weighted by count.
 */
export function scoreCase(benchCase: BenchmarkCase, generated: GeneratedOfferLike): CaseScore {
  const generatedBySku = new Map<string, { quantity: number }>();
  for (const item of generated.items) {
    generatedBySku.set(item.productSku, { quantity: item.quantity });
  }

  const matchedSkus = new Set<string>();
  const verdicts: ItemVerdict[] = benchCase.expected.items.map((expected) => {
    const candidates = [expected.sku, ...(expected.altSkus ?? [])];
    const matchedSku = candidates.find((sku) => generatedBySku.has(sku)) ?? null;
    if (!matchedSku) {
      return {
        expectedSku: expected.sku,
        expectedQuantity: expected.quantity,
        matchedSku: null,
        generatedQuantity: null,
        credit: 0,
      };
    }
    matchedSkus.add(matchedSku);
    const generatedQuantity = generatedBySku.get(matchedSku)?.quantity ?? null;
    // Consume the generated item: one offer line can satisfy only one expected
    // item, even when candidate SKU sets (sku + altSkus) overlap across items.
    generatedBySku.delete(matchedSku);
    return {
      expectedSku: expected.sku,
      expectedQuantity: expected.quantity,
      matchedSku,
      generatedQuantity,
      credit: generatedQuantity === expected.quantity ? 1 : 0.5,
    };
  });

  const credit = verdicts.reduce((sum, v) => sum + v.credit, 0);
  const expectedCount = benchCase.expected.items.length;
  const generatedCount = generatedBySku.size; // deduplicated, consistent with the map used for matching

  const itemRecall = expectedCount === 0 ? 1 : credit / expectedCount;
  const itemPrecision =
    generatedCount === 0 ? (expectedCount === 0 ? 1 : 0) : credit / generatedCount;
  const itemF1 =
    itemRecall + itemPrecision === 0
      ? 0
      : (2 * itemRecall * itemPrecision) / (itemRecall + itemPrecision);

  const extraSkus = generated.items
    .map((item) => item.productSku)
    .filter((sku) => !matchedSkus.has(sku));

  const expectedUnmatched = benchCase.expected.unmatched;
  const missedUnmatched = expectedUnmatched.filter(
    (fragment) => !generated.unmatched.some((u) => fragmentsOverlap(fragment, u)),
  );
  const unmatchedRecall =
    expectedUnmatched.length === 0
      ? null
      : (expectedUnmatched.length - missedUnmatched.length) / expectedUnmatched.length;

  const unmatchedWeight = expectedUnmatched.length;
  const score =
    unmatchedRecall === null
      ? itemF1
      : (itemF1 * expectedCount + unmatchedRecall * unmatchedWeight) /
        (expectedCount + unmatchedWeight);

  return {
    score,
    itemF1,
    itemRecall,
    itemPrecision,
    unmatchedRecall,
    verdicts,
    extraSkus,
    missedUnmatched,
  };
}

export const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

export const stddev = (values: number[]): number => {
  if (values.length < 2) return 0;
  const m = mean(values);
  const sumSq = values.reduce((acc, v) => acc + (v - m) ** 2, 0);
  return Math.sqrt(sumSq / (values.length - 1));
};

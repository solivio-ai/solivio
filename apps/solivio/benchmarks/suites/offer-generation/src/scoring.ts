import type { BenchmarkCase } from "./types";

// Structural subset of GeneratedOffer (the offers service's generateOffer output).
// Kept structural so this module stays importable without the server-only agent code.
export type GeneratedOfferLike = {
  items: Array<{ productSku: string; quantity: number }>;
  unmatched: Array<{ item: string; reason: string }>;
  kbArticles: Array<{ articleTitle: string }>;
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
  // KB citation scoring — all null when the case does not opt in (neither
  // expected.kbArticles nor forbiddenKbArticles set). Recall-based: rewards
  // citing the expected article; extra relevant citations are NOT penalized.
  // citationScore equals citationRecall unless a forbidden article was cited,
  // in which case it is 0 (the distractor "must not surface" penalty).
  citationScore: number | null;
  citationRecall: number | null;
  citedTitles: string[]; // every article title the agent cited
  missedCitations: string[]; // expected keyphrases not found in any cited title
  forbiddenCitations: string[]; // cited titles matching a forbidden keyphrase
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

// A cited title satisfies an expected keyphrase when ALL of the keyphrase's
// significant tokens appear in the title — stricter than fragmentsOverlap so a
// single shared word (titles often share generic terms) is not a match.
const citationMatches = (expectedKey: string, title: string): boolean => {
  const want = significantTokens(expectedKey);
  if (want.size === 0) return false;
  const have = significantTokens(title);
  for (const t of want) if (!have.has(t)) return false;
  return true;
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
  // Snapshot before matching: the loop below consumes matched entries, so the
  // map's size afterwards is only the count of unmatched extras.
  const generatedCount = generatedBySku.size;

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
    (fragment) => !generated.unmatched.some((u) => fragmentsOverlap(fragment, u.item)),
  );
  const unmatchedRecall =
    expectedUnmatched.length === 0
      ? null
      : (expectedUnmatched.length - missedUnmatched.length) / expectedUnmatched.length;

  const unmatchedWeight = expectedUnmatched.length;

  // KB citation scoring. Opt-in when the case declares expected.kbArticles or
  // forbiddenKbArticles. Deliberately RECALL-based, not precision-based: the
  // agent legitimately reaches for relevant articles we did not enumerate, so
  // extra citations are never punished. The only penalty is citing an article
  // the case explicitly forbids (a distractor-space article), which zeroes the
  // citation dimension for that run — that is the "must not surface" test.
  const expectedCitations = benchCase.expected.kbArticles;
  const forbiddenCitationKeys = benchCase.expected.forbiddenKbArticles;
  const opensCitationScoring =
    expectedCitations !== undefined || forbiddenCitationKeys !== undefined;
  const citedTitles = generated.kbArticles.map((a) => a.articleTitle);
  let citationScore: number | null = null;
  let citationRecall: number | null = null;
  let missedCitations: string[] = [];
  let forbiddenCitations: string[] = [];
  if (opensCitationScoring) {
    const expected = expectedCitations ?? [];
    missedCitations = expected.filter(
      (key) => !citedTitles.some((title) => citationMatches(key, title)),
    );
    citationRecall =
      expected.length === 0 ? 1 : (expected.length - missedCitations.length) / expected.length;
    forbiddenCitations = citedTitles.filter((title) =>
      (forbiddenCitationKeys ?? []).some((key) => citationMatches(key, title)),
    );
    citationScore = forbiddenCitations.length > 0 ? 0 : citationRecall;
  }

  // Headline score: weighted mean of the present dimensions. Items weigh by
  // expected-item count, unmatched by expected-unmatched count, citation by
  // max(expected citations, 1) so a cite-nothing/forbidden case still counts.
  const terms: Array<[value: number, weight: number]> = [[itemF1, expectedCount]];
  if (unmatchedRecall !== null) terms.push([unmatchedRecall, unmatchedWeight]);
  if (citationScore !== null)
    terms.push([citationScore, Math.max(expectedCitations?.length ?? 0, 1)]);
  const totalWeight = terms.reduce((sum, [, w]) => sum + w, 0);
  const score = totalWeight === 0 ? 0 : terms.reduce((sum, [v, w]) => sum + v * w, 0) / totalWeight;

  return {
    score,
    itemF1,
    itemRecall,
    itemPrecision,
    unmatchedRecall,
    verdicts,
    extraSkus,
    missedUnmatched,
    citationScore,
    citationRecall,
    citedTitles,
    missedCitations,
    forbiddenCitations,
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

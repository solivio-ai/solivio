// Benchmark suite for offer-generation-agent. Owns everything specific to that
// agent: case format, fixtures, invocation, scoring and report rendering.
// run.ts only consumes this surface — a future suite for another agent copies
// the pattern (own cases/, own scorer, own report) rather than fitting a
// generic framework.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { getModelFor } from "../../../src/server/agents/modelConfig";
import type { GeneratedOffer } from "../../../src/server/agents/offerGenerationAgent";
import { generateOfferWithAgent } from "../../../src/server/agents/offerGenerationAgent";
import { getDefaultEmbeddingModel } from "../../../src/server/products/embeddingConfig";
import { syncCatalog } from "../../src/setup";
import { buildJsonReport, buildMarkdownReport } from "./src/report";
import type { CaseScore } from "./src/scoring";
import { scoreCase } from "./src/scoring";
import type { BenchmarkCase } from "./src/types";
import { benchmarkCaseSchema, catalogFileSchema } from "./src/types";

export type { BenchmarkCase, CaseScore, GeneratedOffer };
export { buildJsonReport, buildMarkdownReport };

const casesDir = path.join(import.meta.dirname, "cases");

export const name = "offer-generation";

const loadCatalog = () =>
  catalogFileSchema.parse(JSON.parse(readFileSync(path.join(casesDir, "catalog.json"), "utf8")));

/** Seeds the benchmark DB with this suite's fixtures (idempotent sync). */
export async function prepare(): Promise<void> {
  const catalog = loadCatalog();
  const { embedded } = await syncCatalog(catalog.products);
  console.log(`Catalog synced: ${catalog.products.length} products (${embedded} re-embedded).`);
}

export function loadCases(filters: {
  caseIds: Set<string> | null;
  difficulties: Set<string> | null;
}): BenchmarkCase[] {
  return readdirSync(casesDir)
    .filter((f) => f.endsWith(".json") && f !== "catalog.json")
    .map((f) => benchmarkCaseSchema.parse(JSON.parse(readFileSync(path.join(casesDir, f), "utf8"))))
    .filter((c) => !filters.caseIds || filters.caseIds.has(c.id))
    .filter((c) => !filters.difficulties || filters.difficulties.has(c.difficulty));
}

/** Scores are only comparable between runs with the same fingerprint. */
export function fingerprint(cases: BenchmarkCase[]): string {
  return createHash("sha256")
    .update(JSON.stringify(loadCatalog()))
    .update(JSON.stringify(cases))
    .digest("hex")
    .slice(0, 12);
}

export function modelInfo() {
  return { model: getModelFor("offerGeneration"), embeddingModel: getDefaultEmbeddingModel() };
}

export async function runCase(benchCase: BenchmarkCase): Promise<GeneratedOffer> {
  return generateOfferWithAgent(benchCase.request, benchCase.customer.name);
}

export const emptyOutput: GeneratedOffer = { items: [], unmatched: [], notes: [] };

export function score(benchCase: BenchmarkCase, generated: GeneratedOffer): CaseScore {
  return scoreCase(benchCase, generated);
}

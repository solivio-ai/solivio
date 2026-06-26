// Benchmark suite for offer-generation-agent. Owns everything specific to that
// agent: case format, fixtures, invocation, scoring and report rendering.
// run.ts only consumes this surface — a future suite for another agent copies
// the pattern (own cases/, own scorer, own report) rather than fitting a
// generic framework.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Services } from "@solivio/sdk";
import { getAi, getService } from "@solivio/sdk/runtime";

import { csvOrderImporter } from "../../../../../modules/csv-import/src/lib/orderImporter.ts";
import { csvProductImporter } from "../../../../../modules/csv-import/src/lib/productImporter.ts";
import { importPayloadSchema } from "../../../../../modules/knowledge-base/src/lib/importSchema.ts";
import { syncCatalog, syncKB, syncOrders } from "../../src/setup";
import { buildJsonReport, buildMarkdownReport } from "./src/report";
import type { CaseScore } from "./src/scoring";
import { scoreCase } from "./src/scoring";
import type { BenchmarkCase } from "./src/types";
import { benchmarkCaseSchema } from "./src/types";

/** The agent's structured output, as typed by the offers service contract. */
export type GeneratedOffer = Awaited<ReturnType<Services["offers"]["generateOffer"]>>;

export type { BenchmarkCase, CaseScore };
export { buildJsonReport, buildMarkdownReport };

const casesDir = path.join(import.meta.dirname, "cases");
// Seed data imported into the benchmark DB (catalog, orders, KB) — distinct
// from cases/, which holds only the scored case files.
const fixturesDir = path.join(import.meta.dirname, "fixtures");

export const name = "offer-generation";

const catalogPath = path.join(fixturesDir, "catalog.csv");
const readCatalogCsv = () => readFileSync(catalogPath, "utf8");

/** Parses the catalog fixture through the same CSV importer the app and seeder use. */
async function loadCatalog() {
  const result = await csvProductImporter.run(readCatalogCsv());
  if (result.status === "failed") {
    throw new Error(
      `Benchmark catalog.csv failed to parse: ${result.errors
        .slice(0, 3)
        .map((e) => e.message)
        .join("; ")}`,
    );
  }
  return result.records;
}

const ordersPath = path.join(fixturesDir, "orders.csv");
const readOrdersCsv = () => readFileSync(ordersPath, "utf8");

/** Parses the historical-orders fixture through the same CSV importer the app uses. */
async function loadOrders() {
  const result = await csvOrderImporter.run(readOrdersCsv());
  if (result.status === "failed") {
    throw new Error(
      `Benchmark orders.csv failed to parse: ${result.errors
        .slice(0, 3)
        .map((e) => e.message)
        .join("; ")}`,
    );
  }
  return result.records;
}

const kbPath = path.join(fixturesDir, "knowledge-base.json");
const readKbJson = () => readFileSync(kbPath, "utf8");

/** Parses the knowledge-base fixture through the app's import schema. */
function loadKnowledgeBase() {
  const parsed = importPayloadSchema.safeParse(JSON.parse(readKbJson()));
  if (!parsed.success) {
    throw new Error(
      `Benchmark knowledge-base.json failed to parse: ${parsed.error.issues.length} issues`,
    );
  }
  return parsed.data;
}

/** Seeds the benchmark DB with this suite's fixtures (idempotent sync). */
export async function prepare(): Promise<void> {
  const products = await loadCatalog();
  const { embedded } = await syncCatalog(products);
  console.log(`Catalog synced: ${products.length} products (${embedded} re-embedded).`);

  const orders = await loadOrders();
  const { created } = await syncOrders(orders);
  console.log(`Orders synced: ${created} historical orders seeded.`);

  const kb = loadKnowledgeBase();
  const { spaces, articles, embeddedChunks } = await syncKB(kb);
  console.log(
    `KB synced: ${spaces} spaces, ${articles} articles (${embeddedChunks} chunks embedded).`,
  );
}

export function loadCases(filters: {
  caseIds: Set<string> | null;
  difficulties: Set<string> | null;
}): BenchmarkCase[] {
  return (
    readdirSync(casesDir)
      .filter((f) => f.endsWith(".json"))
      // readdir order is filesystem-dependent; the fingerprint hashes the loaded
      // array, so a stable order is required for cross-machine comparability.
      .sort()
      .map((f) =>
        benchmarkCaseSchema.parse(JSON.parse(readFileSync(path.join(casesDir, f), "utf8"))),
      )
      .filter((c) => !filters.caseIds || filters.caseIds.has(c.id))
      .filter((c) => !filters.difficulties || filters.difficulties.has(c.difficulty))
  );
}

/** Scores are only comparable between runs with the same fingerprint. */
export function fingerprint(cases: BenchmarkCase[]): string {
  return createHash("sha256")
    .update(readCatalogCsv())
    .update(readOrdersCsv())
    .update(readKbJson())
    .update(JSON.stringify(cases))
    .digest("hex")
    .slice(0, 12);
}

export function modelInfo() {
  return { model: getAi().modelFor("offerGeneration"), embeddingModel: getAi().embeddingModelId() };
}

export async function runCase(benchCase: BenchmarkCase): Promise<GeneratedOffer> {
  // The app always generates against a selected customer; mirror that so the
  // agent has customer scope (e.g. for recall_order_history). upsertByName is
  // idempotent and resolves to the same customer the order fixture seeded.
  const customer = await getService("customers").upsertByName(benchCase.customer.name, "benchmark");
  return getService("offers").generateOffer({
    request: benchCase.request,
    customerName: benchCase.customer.name,
    customerId: customer.id,
  });
}

export const emptyOutput: GeneratedOffer = { items: [], unmatched: [], notes: [], kbArticles: [] };

export function score(benchCase: BenchmarkCase, generated: GeneratedOffer): CaseScore {
  return scoreCase(benchCase, generated);
}

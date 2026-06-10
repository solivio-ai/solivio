import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// Report renderers are pure modules (no server imports), one per suite.
export const SUITE_REPORTS = {
  "offer-generation": () => import("../suites/offer-generation/src/report"),
};

export type SuiteName = keyof typeof SUITE_REPORTS;

export function resolveSuite(name: string) {
  const loader = SUITE_REPORTS[name as SuiteName];
  if (!loader) {
    throw new Error(`Unknown suite "${name}". Available: ${Object.keys(SUITE_REPORTS).join(", ")}`);
  }
  return loader;
}

/** Returns the path to the given result file, or the newest one for the suite. */
export function resolveResultFile(benchmarksDir: string, suite: string, file?: string): string {
  if (file) return path.resolve(file);
  const resultsDir = path.join(benchmarksDir, "results", suite);
  const candidates = readdirSync(resultsDir)
    .filter((f) => f.endsWith(".json") && f !== "history.jsonl")
    .sort();
  if (candidates.length === 0) throw new Error(`No result files in ${resultsDir}`);
  return path.join(resultsDir, candidates[candidates.length - 1]);
}

export function readResult(jsonPath: string) {
  return JSON.parse(readFileSync(jsonPath, "utf8"));
}

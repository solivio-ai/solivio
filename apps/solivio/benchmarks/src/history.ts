import { appendFileSync, existsSync, readFileSync } from "node:fs";

export type HistoryEntry = {
  timestamp: string;
  gitCommit: string | null;
  suite?: string;
  model: string;
  embeddingModel: string;
  runsPerCase: number;
  // Hash of the catalog + the cases actually run. Scores are only comparable
  // between runs with the same hash — a changed case set is a new baseline.
  caseSetHash: string;
  resultFile: string;
  overall: number;
  cases: Array<{ id: string; difficulty?: string; mean: number; stddev: number }>;
};

export function readHistory(historyPath: string): HistoryEntry[] {
  if (!existsSync(historyPath)) return [];
  return readFileSync(historyPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as HistoryEntry);
}

export function appendHistory(historyPath: string, entry: HistoryEntry): void {
  appendFileSync(historyPath, `${JSON.stringify(entry)}\n`);
}

export function lastComparable(
  history: HistoryEntry[],
  caseSetHash: string,
): HistoryEntry | undefined {
  return history.filter((e) => e.caseSetHash === caseSetHash).at(-1);
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const delta = (from: number, to: number) => {
  const d = (to - from) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}`;
};

/** Console lines comparing the current entry against the previous comparable run. */
export function formatComparison(previous: HistoryEntry, current: HistoryEntry): string[] {
  const lines: string[] = [];
  const sameModel = previous.model === current.model;
  lines.push(
    `Compared to previous run (${previous.timestamp.slice(0, 16)}, commit ${
      previous.gitCommit ?? "n/a"
    }${sameModel ? "" : `, model ${previous.model}`}):`,
  );
  lines.push(
    `  Overall: ${pct(previous.overall)} → ${pct(current.overall)} (${delta(previous.overall, current.overall)})`,
  );

  const previousById = new Map(previous.cases.map((c) => [c.id, c]));
  let changed = 0;
  for (const c of current.cases) {
    const prev = previousById.get(c.id);
    if (!prev) continue;
    if (Math.abs(prev.mean - c.mean) < 0.0005) continue;
    changed++;
    lines.push(`  ${c.id}: ${pct(prev.mean)} → ${pct(c.mean)} (${delta(prev.mean, c.mean)})`);
  }
  if (changed === 0) lines.push("  All per-case scores unchanged.");
  return lines;
}

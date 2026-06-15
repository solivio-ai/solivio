import type { CaseScore, GeneratedOfferLike } from "./scoring";
import { mean, stddev } from "./scoring";
import type { BenchmarkCase, Difficulty } from "./types";
import { DIFFICULTY_ORDER } from "./types";

export type RunResult = {
  score: CaseScore;
  generated: GeneratedOfferLike;
  durationMs: number;
  error?: string;
};

export type CaseResult = {
  benchCase: BenchmarkCase;
  runs: RunResult[];
};

export type BenchmarkMeta = {
  timestamp: string;
  model: string;
  embeddingModel: string;
  runsPerCase: number;
  gitCommit: string | null;
  caseSetHash: string;
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

// Committed result files written before unmatched entries carried a reason
// store plain strings; render both shapes.
const formatUnmatched = (u: string | { item: string; reason: string }) =>
  typeof u === "string" ? u : u.reason ? `${u.item} (${u.reason})` : u.item;

export function aggregate(results: CaseResult[]) {
  const caseMeans = results.map((r) => mean(r.runs.map((run) => run.score.score)));
  const tiers: Partial<Record<Difficulty, { mean: number; caseCount: number }>> = {};
  for (const tier of DIFFICULTY_ORDER) {
    const tierMeans = results
      .map((r, i) => (r.benchCase.difficulty === tier ? caseMeans[i] : null))
      .filter((m): m is number => m !== null);
    if (tierMeans.length > 0) tiers[tier] = { mean: mean(tierMeans), caseCount: tierMeans.length };
  }
  return {
    meanScore: mean(caseMeans),
    stddevAcrossCases: stddev(caseMeans),
    tiers,
    cases: results.map((r, i) => ({
      id: r.benchCase.id,
      difficulty: r.benchCase.difficulty,
      title: r.benchCase.title,
      mean: caseMeans[i],
      stddev: stddev(r.runs.map((run) => run.score.score)),
    })),
  };
}

export function buildJsonReport(meta: BenchmarkMeta, results: CaseResult[]) {
  return {
    meta,
    aggregate: aggregate(results),
    cases: results.map((r) => ({
      id: r.benchCase.id,
      title: r.benchCase.title,
      caseFile: `../../suites/offer-generation/cases/${r.benchCase.id}.json`,
      runs: r.runs.map((run) => ({
        score: run.score.score,
        itemF1: run.score.itemF1,
        itemRecall: run.score.itemRecall,
        itemPrecision: run.score.itemPrecision,
        unmatchedRecall: run.score.unmatchedRecall,
        verdicts: run.score.verdicts,
        extraSkus: run.score.extraSkus,
        missedUnmatched: run.score.missedUnmatched,
        durationMs: run.durationMs,
        error: run.error ?? null,
        generated: run.generated,
      })),
    })),
  };
}

// The committed .json result file is the single source of truth; markdown is
// rendered from it (yarn benchmark:report), never directly from a live run.
export type JsonReport = ReturnType<typeof buildJsonReport>;

const tierByCaseId = (report: JsonReport) => new Map(report.aggregate.cases.map((c) => [c.id, c]));

function summaryTables(report: JsonReport, caseLinkPrefix: string): string[] {
  const lines: string[] = [];
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(
    `| **Overall score** | **${pct(report.aggregate.meanScore)}** (macro mean over ${report.cases.length} cases) |`,
  );
  lines.push(`| Model | \`${report.meta.model}\` |`);
  lines.push(`| Embedding model | \`${report.meta.embeddingModel}\` |`);
  lines.push(`| Runs per case | ${report.meta.runsPerCase} |`);
  lines.push(`| Git commit | ${report.meta.gitCommit ? `\`${report.meta.gitCommit}\`` : "n/a"} |`);
  lines.push(
    `| Case set | \`${report.meta.caseSetHash}\` (scores only comparable within the same case set) |`,
  );
  lines.push("");
  lines.push("### Scores by difficulty");
  lines.push("");
  lines.push("| Tier | Score | Cases |");
  lines.push("|---|---|---|");
  for (const tier of DIFFICULTY_ORDER) {
    const t = report.aggregate.tiers[tier];
    if (t) lines.push(`| ${tier} | ${pct(t.mean)} | ${t.caseCount} |`);
  }
  lines.push("");
  lines.push("### Per-case scores");
  lines.push("");
  lines.push("| Case | Tier | Score (mean) | Stddev | Notes |");
  lines.push("|---|---|---|---|---|");
  const titles = new Map(report.cases.map((c) => [c.id, c.title]));
  for (const c of report.aggregate.cases) {
    lines.push(
      `| [${c.id}](${caseLinkPrefix}${c.id}.json) | ${c.difficulty} | ${pct(c.mean)} | ±${pct(
        c.stddev,
      )} | ${titles.get(c.id) ?? ""} |`,
    );
  }
  return lines;
}

/** Full markdown report, rendered next to the .json result file. */
export function buildMarkdownReport(report: JsonReport): string {
  const tiers = tierByCaseId(report);
  const lines: string[] = [];

  lines.push(`# Offer generation benchmark — ${report.meta.timestamp}`);
  lines.push("");
  lines.push(...summaryTables(report, "../../suites/offer-generation/cases/"));
  lines.push("");

  for (const c of report.cases) {
    lines.push(`## ${c.id} — ${c.title}`);
    lines.push("");
    lines.push(`Case file: [\`cases/${c.id}.json\`](${c.caseFile})`);
    lines.push(`Tier: ${tiers.get(c.id)?.difficulty ?? "?"}`);
    lines.push("");
    for (const [runIndex, run] of c.runs.entries()) {
      lines.push(
        `### Run ${runIndex + 1} — score ${pct(run.score)} (${Math.round(run.durationMs / 1000)}s)`,
      );
      lines.push("");
      if (run.error) {
        lines.push(`**Error:** ${run.error}`);
        lines.push("");
        continue;
      }
      lines.push("| Expected SKU | Expected qty | Matched | Generated qty | Credit |");
      lines.push("|---|---|---|---|---|");
      for (const v of run.verdicts) {
        lines.push(
          `| ${v.expectedSku} | ${v.expectedQuantity} | ${v.matchedSku ?? "—"} | ${
            v.generatedQuantity ?? "—"
          } | ${v.credit} |`,
        );
      }
      if (run.extraSkus.length > 0) {
        lines.push("");
        lines.push(`Extra (unexpected) items: ${run.extraSkus.join(", ")}`);
      }
      if (run.unmatchedRecall !== null) {
        lines.push("");
        lines.push(
          `Expected-unmatched recall: ${pct(run.unmatchedRecall)}${
            run.missedUnmatched.length > 0 ? ` (missed: ${run.missedUnmatched.join("; ")})` : ""
          }`,
        );
      }
      if (run.generated.unmatched.length > 0) {
        lines.push("");
        lines.push(
          `Agent reported unmatched: ${run.generated.unmatched.map(formatUnmatched).join("; ")}`,
        );
      }
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}

/** Summary block injected into benchmarks/README.md between latest-result markers. */
export function buildReadmeSummary(report: JsonReport, resultRelPath: string): string {
  const lines: string[] = [];
  lines.push(
    `Latest run: **${report.meta.timestamp.slice(0, 16).replace("T", " ")}** — full data: [\`${resultRelPath}\`](${resultRelPath})`,
  );
  lines.push("");
  lines.push(...summaryTables(report, "suites/offer-generation/cases/"));
  lines.push("");
  lines.push(
    `For a detailed per-run markdown report (verdict tables for every case), run \`yarn benchmark:report --file ${resultRelPath}\`.`,
  );
  return `${lines.join("\n")}\n`;
}

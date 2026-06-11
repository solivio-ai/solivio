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

export function buildMarkdownReport(meta: BenchmarkMeta, results: CaseResult[]): string {
  const agg = aggregate(results);
  const lines: string[] = [];

  lines.push(`# Offer generation benchmark — ${meta.timestamp}`);
  lines.push("");
  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(
    `| **Overall score** | **${pct(agg.meanScore)}** (macro mean over ${results.length} cases) |`,
  );
  lines.push(`| Model | \`${meta.model}\` |`);
  lines.push(`| Embedding model | \`${meta.embeddingModel}\` |`);
  lines.push(`| Runs per case | ${meta.runsPerCase} |`);
  lines.push(`| Git commit | ${meta.gitCommit ? `\`${meta.gitCommit}\`` : "n/a"} |`);
  lines.push(
    `| Case set | \`${meta.caseSetHash}\` (scores only comparable within the same case set) |`,
  );
  lines.push("");
  lines.push("## Scores by difficulty");
  lines.push("");
  lines.push("| Tier | Score | Cases |");
  lines.push("|---|---|---|");
  for (const tier of DIFFICULTY_ORDER) {
    const t = agg.tiers[tier];
    if (t) lines.push(`| ${tier} | ${pct(t.mean)} | ${t.caseCount} |`);
  }
  lines.push("");
  lines.push("## Per-case scores");
  lines.push("");
  lines.push("| Case | Tier | Score (mean) | Stddev | Item F1 | Notes |");
  lines.push("|---|---|---|---|---|---|");
  for (const r of results) {
    const scores = r.runs.map((run) => run.score.score);
    const f1s = r.runs.map((run) => run.score.itemF1);
    lines.push(
      `| [${r.benchCase.id}](../../suites/offer-generation/cases/${r.benchCase.id}.json) | ${r.benchCase.difficulty} | ${pct(
        mean(scores),
      )} | ±${pct(stddev(scores))} | ${pct(mean(f1s))} | ${r.benchCase.title} |`,
    );
  }
  lines.push("");

  for (const r of results) {
    lines.push(`## ${r.benchCase.id} — ${r.benchCase.title}`);
    lines.push("");
    lines.push(
      `Case file: [\`cases/${r.benchCase.id}.json\`](../../suites/offer-generation/cases/${r.benchCase.id}.json)`,
    );
    lines.push("");
    for (const [runIndex, run] of r.runs.entries()) {
      lines.push(
        `### Run ${runIndex + 1} — score ${pct(run.score.score)} (${Math.round(run.durationMs / 1000)}s)`,
      );
      lines.push("");
      if (run.error) {
        lines.push(`**Error:** ${run.error}`);
        lines.push("");
        continue;
      }
      lines.push("| Expected SKU | Expected qty | Matched | Generated qty | Credit |");
      lines.push("|---|---|---|---|---|");
      for (const v of run.score.verdicts) {
        lines.push(
          `| ${v.expectedSku} | ${v.expectedQuantity} | ${v.matchedSku ?? "—"} | ${
            v.generatedQuantity ?? "—"
          } | ${v.credit} |`,
        );
      }
      if (run.score.extraSkus.length > 0) {
        lines.push("");
        lines.push(`Extra (unexpected) items: ${run.score.extraSkus.join(", ")}`);
      }
      if (run.score.unmatchedRecall !== null) {
        lines.push("");
        lines.push(
          `Expected-unmatched recall: ${pct(run.score.unmatchedRecall)}${
            run.score.missedUnmatched.length > 0
              ? ` (missed: ${run.score.missedUnmatched.join("; ")})`
              : ""
          }`,
        );
      }
      if (run.generated.unmatched.length > 0) {
        lines.push("");
        lines.push(`Agent reported unmatched: ${run.generated.unmatched.join("; ")}`);
      }
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}

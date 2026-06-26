// Benchmark harness. Suite-specific logic (cases, scoring, reports) lives in
// suites/<name>/suite.ts; this file owns env, DB bootstrap, the run loop,
// history and file output. See benchmarks/README.md.
//
// Must run with the react-server condition so `server-only` imports resolve:
//   yarn benchmark [--suite name] [--runs N] [--concurrency N]
//                  [--case id1,id2] [--difficulty hard,expert] [--model <model>]

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { config } from "dotenv";

import { appendHistory, formatComparison, lastComparable, readHistory } from "./src/history";

const appRoot = path.resolve(import.meta.dirname, "..");

// One entry per benchmarked agent. Suites are loaded dynamically so server
// code is only imported after DATABASE_URL points at the benchmark DB.
const SUITES = {
  "offer-generation": () => import("./suites/offer-generation/suite"),
};

// Benchmarks default to a cheaper model than the app's production default
// (gpt-5.5) to keep runs affordable; the offer-generation tool loop still needs
// real reasoning, so mini — not nano — is the floor. Override with --model
// (e.g. --model openai/gpt-5.5 for a quality ceiling).
const DEFAULT_BENCHMARK_MODEL = "openai/gpt-5.4-mini";

// NaN here would silently produce zero jobs and an all-zero history entry.
function parsePositiveInt(name: string, value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`--${name} must be a positive integer, got "${value}"`);
  }
  return parsed;
}

async function main() {
  const { values: args } = parseArgs({
    options: {
      suite: { type: "string", default: "offer-generation" },
      runs: { type: "string", default: "1" },
      concurrency: { type: "string", default: "4" },
      case: { type: "string" },
      difficulty: { type: "string" },
      model: { type: "string" },
    },
  });
  const runsPerCase = parsePositiveInt("runs", args.runs ?? "1");
  const concurrency = parsePositiveInt("concurrency", args.concurrency ?? "4");
  const suiteLoader = SUITES[args.suite as keyof typeof SUITES];
  if (!suiteLoader) {
    throw new Error(`Unknown suite "${args.suite}". Available: ${Object.keys(SUITES).join(", ")}`);
  }

  // Same env layering as scripts/migrate.mjs: .env.local first, .env fallback.
  config({ path: path.join(appRoot, ".env.local") });
  config({ path: path.join(appRoot, ".env") });
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  process.env.OPENAI_MODEL_OFFER_GENERATION = args.model ?? DEFAULT_BENCHMARK_MODEL;

  // Point the app's Drizzle client at the dedicated benchmark DB. Must happen
  // before any server module is imported (db.ts reads the env var at init).
  const adminUrl = process.env.DATABASE_URL;
  const benchmarkUrl =
    process.env.SOLIVIO_BENCHMARK_DATABASE_URL ??
    (() => {
      const url = new URL(adminUrl);
      url.pathname = "/solivio_benchmark";
      return url.toString();
    })();
  process.env.DATABASE_URL = benchmarkUrl;

  const setup = await import("./src/setup");
  console.log(`Preparing benchmark database (${new URL(benchmarkUrl).pathname.slice(1)})...`);
  await setup.ensureBenchmarkDatabase(adminUrl, benchmarkUrl);
  // The real migration runner: core journal plus every enabled module's
  // journal (the products table lives in the catalog module's journal).
  execSync("node scripts/migrate.mjs", {
    cwd: appRoot,
    env: { ...process.env, DATABASE_URL: benchmarkUrl },
    stdio: "inherit",
  });

  // Boot the module runtime (services, db, agent tools) exactly like
  // instrumentation.ts does in the app — minus the pg-boss job engine, which
  // benchmarks don't need. Must come after the DATABASE_URL rewrite: the
  // Drizzle client binds to the env var when boot imports it.
  const { bootModuleRuntime } = await import("../src/server/runtime/boot");
  bootModuleRuntime();

  const suite = await suiteLoader();
  await suite.prepare();

  const cases = suite.loadCases({
    caseIds: args.case ? new Set(args.case.split(",")) : null,
    difficulties: args.difficulty ? new Set(args.difficulty.split(",")) : null,
  });
  if (cases.length === 0) throw new Error("No benchmark cases matched.");
  const caseSetHash = suite.fingerprint(cases);
  const { model, embeddingModel } = suite.modelInfo();

  console.log(
    `Running ${suite.name}: ${cases.length} cases × ${runsPerCase} runs (concurrency ${concurrency}, model ${model})...`,
  );

  type RunResult = {
    score: ReturnType<typeof suite.score>;
    generated: Awaited<ReturnType<typeof suite.runCase>>;
    durationMs: number;
    error?: string;
  };
  const jobs = cases.flatMap((benchCase) =>
    Array.from({ length: runsPerCase }, (_, runIndex) => ({ benchCase, runIndex })),
  );
  const resultsByCase = new Map<string, RunResult[]>(cases.map((c) => [c.id, []]));

  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      const started = Date.now();
      let result: RunResult;
      try {
        const generated = await suite.runCase(job.benchCase);
        result = {
          generated,
          score: suite.score(job.benchCase, generated),
          durationMs: Date.now() - started,
        };
      } catch (error) {
        result = {
          generated: suite.emptyOutput,
          score: suite.score(job.benchCase, suite.emptyOutput),
          durationMs: Date.now() - started,
          error: error instanceof Error ? error.message : String(error),
        };
      }
      resultsByCase.get(job.benchCase.id)?.push(result);
      console.log(
        `  ${job.benchCase.id} run ${job.runIndex + 1}/${runsPerCase}: ${(result.score.score * 100).toFixed(1)}%` +
          (result.error ? ` (ERROR: ${result.error})` : ""),
      );
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));

  const results = cases.map((benchCase) => ({
    benchCase,
    runs: resultsByCase.get(benchCase.id) ?? [],
  }));

  let gitCommit: string | null = null;
  try {
    gitCommit = execSync("git rev-parse --short HEAD", { cwd: appRoot }).toString().trim();
  } catch {
    // not in a git checkout — leave null
  }

  const timestamp = new Date().toISOString();
  const meta = { timestamp, model, embeddingModel, runsPerCase, gitCommit, caseSetHash };

  const resultsDir = path.join(import.meta.dirname, "results", suite.name);
  const stamp = timestamp.replace(/[:T]/g, "-").slice(0, 19);
  const slug = `${stamp}__${model.replace(/[^a-zA-Z0-9.-]+/g, "-")}`;
  mkdirSync(resultsDir, { recursive: true });
  const jsonPath = path.join(resultsDir, `${slug}.json`);
  writeFileSync(jsonPath, `${JSON.stringify(suite.buildJsonReport(meta, results), null, 2)}\n`);

  const overall = suite.buildJsonReport(meta, results).aggregate;
  console.log(`\nOverall score: ${(overall.meanScore * 100).toFixed(1)}%`);
  for (const [tier, t] of Object.entries(overall.tiers)) {
    console.log(`  [${tier}] ${(t.mean * 100).toFixed(1)}% (${t.caseCount} cases)`);
  }
  for (const c of overall.cases) {
    console.log(
      `  ${c.id} (${c.difficulty}): ${(c.mean * 100).toFixed(1)}%${runsPerCase > 1 ? ` ±${(c.stddev * 100).toFixed(1)}` : ""}`,
    );
  }

  const historyPath = path.join(resultsDir, "history.jsonl");
  const entry = {
    timestamp,
    gitCommit,
    suite: suite.name,
    model,
    embeddingModel,
    runsPerCase,
    caseSetHash,
    resultFile: `${slug}.json`,
    overall: overall.meanScore,
    cases: overall.cases,
  };
  const previous = lastComparable(readHistory(historyPath), caseSetHash);
  console.log("");
  if (previous) {
    for (const line of formatComparison(previous, entry)) console.log(line);
  } else {
    console.log(`No previous run with this case set (${caseSetHash}) — this is a new baseline.`);
  }
  appendHistory(historyPath, entry);

  console.log(`\nResult written: ${jsonPath}`);
  console.log(
    "Render markdown: yarn benchmark:report · refresh README summary: yarn benchmark:readme",
  );

  process.exit(0); // the pg pool keeps the event loop alive
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

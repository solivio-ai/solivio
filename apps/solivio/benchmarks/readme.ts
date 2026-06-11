// Refreshes the "Latest results" section of benchmarks/README.md from a
// committed .json benchmark result (the newest one by default).
//
//   yarn benchmark:readme
//   yarn benchmark:readme --file results/offer-generation/<run>.json
//
// Pure file transformation — no DB, no API keys, no agent runs.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { readResult, resolveResultFile, resolveSuite } from "./src/results";

const README_START = "<!-- benchmark-latest:start -->";
const README_END = "<!-- benchmark-latest:end -->";

async function main() {
  const { values: args } = parseArgs({
    options: {
      suite: { type: "string", default: "offer-generation" },
      file: { type: "string" },
    },
  });
  const { buildReadmeSummary } = await resolveSuite(args.suite as string)();

  // Links the committed .json result — the MD report is optional and may not exist.
  const jsonPath = resolveResultFile(import.meta.dirname, args.suite as string, args.file);
  const jsonRelPath = path.relative(import.meta.dirname, jsonPath);

  const readmePath = path.join(import.meta.dirname, "README.md");
  const readme = readFileSync(readmePath, "utf8");
  const start = readme.indexOf(README_START);
  const end = readme.indexOf(README_END);
  if (start === -1 || end === -1) {
    throw new Error(`Markers ${README_START} / ${README_END} not found in ${readmePath}`);
  }
  const summary = buildReadmeSummary(readResult(jsonPath), jsonRelPath);
  const updated = `${readme.slice(0, start + README_START.length)}\n${summary}${readme.slice(end)}`;
  writeFileSync(readmePath, updated);
  console.log(`README summary refreshed from ${path.basename(jsonPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

// Renders a markdown report from a committed .json benchmark result.
//
//   yarn benchmark:report                          # latest result of the default suite
//   yarn benchmark:report --suite offer-generation
//   yarn benchmark:report --file results/offer-generation/<run>.json
//
// Pure file transformation — no DB, no API keys, no agent runs.
// To refresh the README "Latest results" section, use yarn benchmark:readme.

import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { readResult, resolveResultFile, resolveSuite } from "./src/results";

async function main() {
  const { values: args } = parseArgs({
    options: {
      suite: { type: "string", default: "offer-generation" },
      file: { type: "string" },
    },
  });
  const { buildMarkdownReport } = await resolveSuite(args.suite as string)();

  const jsonPath = resolveResultFile(import.meta.dirname, args.suite as string, args.file);
  const mdPath = jsonPath.replace(/\.json$/, ".md");
  writeFileSync(mdPath, buildMarkdownReport(readResult(jsonPath)));
  console.log(`Markdown report: ${mdPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

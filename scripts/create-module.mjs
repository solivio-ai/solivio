#!/usr/bin/env node
/**
 * Scaffolds a new module with the standard shape:
 *
 *   yarn create-module <id>            # e.g. yarn create-module supplier-sync
 *
 * Creates modules/<id>/ with the manifest, package metadata, tsconfig,
 * AGENTS.md, and empty i18n files, then prints the remaining steps
 * (config entry + generate). Capabilities are added by creating the
 * conventional files — see docs/module-system.md.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2];

if (!id || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) {
  console.error("usage: yarn create-module <kebab-case-id>");
  process.exit(1);
}
const dir = path.join(repoRoot, "modules", id);
if (fs.existsSync(dir)) {
  console.error(`modules/${id} already exists`);
  process.exit(1);
}

const title = id
  .split("-")
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join(" ");

const files = {
  "package.json": `${JSON.stringify(
    {
      name: `@solivio/module-${id}`,
      version: "0.1.0",
      private: true,
      description: `${title} module.`,
      type: "module",
      solivio: { module: true },
      types: "./src/index.ts",
      exports: { ".": "./src/index.ts", "./*": "./src/*" },
      scripts: { typecheck: "tsc --project tsconfig.json --noEmit" },
      dependencies: { "@solivio/sdk": "workspace:*" },
      devDependencies: { typescript: "^6.0.3" },
    },
    null,
    2,
  )}\n`,
  "tsconfig.json": `${JSON.stringify(
    { extends: "../../tsconfig.base.json", include: ["src/**/*.ts", "src/**/*.tsx"] },
    null,
    2,
  )}\n`,
  "src/index.ts": `import { defineModule } from "@solivio/sdk";

export default defineModule({
  id: "${id}",
  title: "${title}",
  version: "0.1.0",
  description: "TODO: one line on what this module owns.",
  // dependsOn: ["catalog"],          // modules whose services/events you consume
  // routeGroup: "protected",         // default; "public" skips the session guard
});
`,
  "src/i18n/en.json": "{}\n",
  "src/i18n/pl.json": "{}\n",
  "AGENTS.md": `# ${id} module

TODO: what this module owns (tables, routes, pages, services, events).

Conventions (see docs/module-system.md and modules/products-sync as the
reference example):

- Capabilities are discovered by file existence: \`src/pages/**\`, \`src/api/**\`,
  \`src/services.ts\`, \`src/events.ts\`, \`src/data/schema.ts\` (+ migrations),
  \`src/subscribers/\`, \`src/jobs/\`, \`src/ai/{tools,importers}.ts\`,
  \`src/nav.tsx\`, \`src/slots.tsx\`, \`src/contracts/\`, \`src/acl.ts\`.
- Reach infrastructure only via \`@solivio/sdk/runtime\` — never at import time.
- Cross-module calls go through \`getService()\`; declare providers in
  \`dependsOn\`. New tables must be \`${id.replaceAll("-", "_")}_\`-prefixed.
- After changes: \`yarn generate && yarn check && yarn typecheck\`.
`,
};

for (const [rel, content] of Object.entries(files)) {
  const target = path.join(dir, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

console.log(`created modules/${id}:`);
for (const rel of Object.keys(files)) console.log(`  ${rel}`);
console.log(`
next steps:
  1. add "${id}" to the modules array in solivio.config.ts
  2. yarn install && yarn generate
  3. add capability files (pages/, api/, services.ts, data/schema.ts, …)
     — modules/products-sync shows every surface
  4. tables? yarn db:generate ${id} && yarn db:migrate`);

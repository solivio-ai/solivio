import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateProject } from "next-openapi-gen";

import { createAuth } from "../apps/solivio/src/server/auth/createAuth";

const generatedDirectory = ".openapi-gen";
const betterAuthFragmentFile = path.join(generatedDirectory, "better-auth.json");
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.chdir(repositoryRoot);

await writeBetterAuthFragment();
await generateProject({ configPath: "openapi-gen.config.ts" });

async function writeBetterAuthFragment() {
  const schema = await createAuth().api.generateOpenAPISchema();
  const fragment = {
    components: schema.components,
    paths: Object.fromEntries(
      Object.entries(schema.paths ?? {}).map(([routePath, pathItem]) => [
        `/api/auth${routePath}`,
        pathItem,
      ]),
    ),
    tags: schema.tags,
  };

  await mkdir(generatedDirectory, { recursive: true });
  await writeFile(betterAuthFragmentFile, `${JSON.stringify(fragment, null, 2)}\n`);
}

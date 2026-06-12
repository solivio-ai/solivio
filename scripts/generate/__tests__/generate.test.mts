import assert from "node:assert/strict";
import { test } from "node:test";

import type { ModuleModel } from "../discover.mts";
import { scanExports } from "../discover.mts";

function moduleModel(overrides: Partial<ModuleModel>): ModuleModel {
  return {
    id: "fixture",
    title: "Fixture",
    version: "0.1.0",
    packageName: "@solivio/module-fixture",
    dir: "/repo/modules/fixture",
    inTree: true,
    routeGroup: "protected",
    dependsOn: [],
    options: {},
    pages: [],
    apiRoutes: [],
    subscriberFiles: [],
    jobFiles: [],
    i18n: {},
    permissions: [],
    has: {
      services: false,
      events: false,
      nav: false,
      slots: false,
      schema: false,
      contracts: false,
      aiTools: false,
      aiImporters: false,
      aiAgents: false,
    },
    ...overrides,
  };
}

test("scanExports finds default, named, and re-exported names", () => {
  const result = scanExports(`
export default function Page() {}
export const metadata = { title: "x" };
export async function GET() {}
export { foo as bar };
`);
  assert.equal(result.hasDefault, true);
  assert.deepEqual(result.named.sort(), ["GET", "bar", "metadata"]);
});

test("scanExports separates segment config (inlined into stubs, never re-exported)", () => {
  const result = scanExports(`
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
export async function POST() {}
`);
  assert.deepEqual(result.named, ["POST"]);
  assert.deepEqual(result.segmentConfig, {
    runtime: '"nodejs"',
    maxDuration: "300",
    dynamic: '"force-dynamic"',
  });
});

test("scanExports handles typed const exports", () => {
  const result = scanExports(`export const nav: NavEntry[] = [];`);
  assert.deepEqual(result.named, ["nav"]);
});

test("validate flags page collisions between modules", async () => {
  const { validate } = await import("../validate.mts");
  const a = moduleModel({
    id: "a",
    pages: [
      {
        routePath: "dash",
        kind: "page",
        srcPath: "pages/dash/page.tsx",
        exports: { hasDefault: true, named: [], segmentConfig: {} },
      },
    ],
  });
  const b = moduleModel({
    id: "b",
    packageName: "@solivio/module-b",
    pages: [
      {
        routePath: "dash",
        kind: "page",
        srcPath: "pages/dash/page.tsx",
        exports: { hasDefault: true, named: [], segmentConfig: {} },
      },
    ],
  });
  const errors = validate([a, b], { modules: [] }, process.cwd());
  assert.ok(errors.some((error) => error.includes('Page collision at "/dash"')));
});

test("validate flags unknown dependsOn and cycles", async () => {
  const { validate } = await import("../validate.mts");
  const a = moduleModel({ id: "a", dependsOn: ["b"] });
  const b = moduleModel({ id: "b", packageName: "@solivio/module-b", dependsOn: ["a"] });
  const errors = validate([a, b], { modules: [] }, process.cwd());
  assert.ok(errors.some((error) => error.includes("Cyclic dependsOn")));
  const unknown = validate(
    [moduleModel({ id: "a", dependsOn: ["ghost"] })],
    { modules: [] },
    process.cwd(),
  );
  assert.ok(unknown.some((error) => error.includes('unknown/disabled module "ghost"')));
});

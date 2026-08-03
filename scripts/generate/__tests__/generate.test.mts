import { expect, test } from "vitest";

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
      channels: false,
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
  expect(result.hasDefault).toBe(true);
  expect(result.named.sort()).toEqual(["GET", "bar", "metadata"]);
});

test("scanExports separates segment config (inlined into stubs, never re-exported)", () => {
  const result = scanExports(`
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";
export async function POST() {}
`);
  expect(result.named).toEqual(["POST"]);
  expect(result.segmentConfig).toEqual({
    runtime: '"nodejs"',
    maxDuration: "300",
    dynamic: '"force-dynamic"',
  });
});

test("scanExports handles typed const exports", () => {
  const result = scanExports(`export const nav: NavEntry[] = [];`);
  expect(result.named).toEqual(["nav"]);
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
  expect(errors).toEqual(
    expect.arrayContaining([expect.stringContaining('Page collision at "/dash"')]),
  );
});

test("validate flags unknown dependsOn and cycles", async () => {
  const { validate } = await import("../validate.mts");
  const a = moduleModel({ id: "a", dependsOn: ["b"] });
  const b = moduleModel({ id: "b", packageName: "@solivio/module-b", dependsOn: ["a"] });
  const errors = validate([a, b], { modules: [] }, process.cwd());
  expect(errors).toEqual(expect.arrayContaining([expect.stringContaining("Cyclic dependsOn")]));
  const unknown = validate(
    [moduleModel({ id: "a", dependsOn: ["ghost"] })],
    { modules: [] },
    process.cwd(),
  );
  expect(unknown).toEqual(
    expect.arrayContaining([expect.stringContaining('unknown/disabled module "ghost"')]),
  );
});

test("validate flags a slot bound to a module that does not provide the capability", async () => {
  const { validate } = await import("../validate.mts");

  const provider = moduleModel({
    id: "offer-pdf",
    has: { ...moduleModel({}).has, channels: true },
  });
  const ok = validate(
    [provider],
    {
      modules: ["offer-pdf"],
      slots: { "offer.channel": "offer-pdf/pdf" },
    },
    process.cwd(),
  );
  expect(ok.filter((error) => error.includes("offer.channel"))).toEqual([]);

  // Same binding, but the module ships no channels.ts.
  const withoutChannels = moduleModel({ id: "offer-pdf" });
  const missing = validate(
    [withoutChannels],
    {
      modules: ["offer-pdf"],
      slots: { "offer.channel": "offer-pdf/pdf" },
    },
    process.cwd(),
  );
  expect(missing).toEqual(
    expect.arrayContaining([expect.stringContaining("which has no channels.ts")]),
  );
});

test("validate flags a slot naming an unknown capability kind", async () => {
  const { validate } = await import("../validate.mts");
  const errors = validate(
    [moduleModel({ id: "offer-pdf" })],
    {
      modules: ["offer-pdf"],
      slots: { "offer.chanel": "offer-pdf/pdf" },
    },
    process.cwd(),
  );
  expect(errors).toEqual(
    expect.arrayContaining([expect.stringContaining('unknown capability kind "chanel"')]),
  );
});

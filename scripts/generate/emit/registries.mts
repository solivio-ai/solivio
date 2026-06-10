import type { SolivioConfig } from "@solivio/sdk/config";

import type { ModuleModel } from "../discover.mts";
import type { Writer } from "../lib/write.mts";

const GEN = "apps/solivio/src/generated";

const camel = (id: string): string => id.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

const spec = (module: ModuleModel, srcPath: string): string => `${module.packageName}/${srcPath}`;

export function emitRegistries(
  writer: Writer,
  modules: ModuleModel[],
  config: SolivioConfig,
): void {
  emitModules(writer, modules, config);
  emitServices(writer, modules);
  emitEvents(writer, modules);
  emitJobs(writer, modules);
  emitAi(writer, modules);
  emitNav(writer, modules);
  emitSlots(writer, modules);
  emitAcl(writer, modules);
  emitSchema(writer, modules);
  emitContracts(writer, modules);
}

function emitContracts(writer: Writer, modules: ModuleModel[]): void {
  const providers = modules.filter((module) => module.has.contracts);
  const imports = providers
    .map(
      (module) =>
        `import { routes as ${camel(module.id)}Routes } from "${spec(module, "contracts/routes.ts")}";`,
    )
    .join("\n");
  writer.write(
    `${GEN}/contracts.ts`,
    `import type { ApiContract } from "@solivio/sdk/contracts";
${imports ? `\n${imports}\n` : ""}
export const moduleApiContracts: readonly ApiContract[] = [
${providers.map((module) => `  ...${camel(module.id)}Routes,`).join("\n")}
];
`,
  );
}

function emitModules(writer: Writer, modules: ModuleModel[], config: SolivioConfig): void {
  const infos = modules.map((module) => ({
    id: module.id,
    title: module.title,
    version: module.version,
    description: module.description,
    packageName: module.packageName,
    pages: module.pages.filter((page) => page.kind === "page").map((page) => `/${page.routePath}`),
    routes: module.apiRoutes.map((route) => `/api/${route.routePath}`),
  }));
  const options = Object.fromEntries(modules.map((module) => [module.id, module.options]));
  writer.write(
    `${GEN}/modules.ts`,
    `export interface GeneratedModuleInfo {
  id: string;
  title: string;
  version: string;
  description?: string;
  packageName: string;
  pages: string[];
  routes: string[];
}

export const modules: GeneratedModuleInfo[] = ${JSON.stringify(infos, null, 2)};

export const moduleOptions: Record<string, unknown> = ${JSON.stringify(options, null, 2)};

export const slotBindings: Record<string, string> = ${JSON.stringify(config.slots ?? {}, null, 2)};
`,
  );
}

function emitServices(writer: Writer, modules: ModuleModel[]): void {
  const providers = modules.filter((module) => module.has.services);
  const imports = providers
    .map(
      (module) =>
        `import { services as ${camel(module.id)}Services } from "${spec(module, "services.ts")}";`,
    )
    .join("\n");
  const spreads = providers.map((module) => `  ...${camel(module.id)}Services,`).join("\n");
  writer.write(
    `${GEN}/services.ts`,
    `import type { Services } from "@solivio/sdk";
${imports ? `\n${imports}\n` : ""}
const factories: Record<string, (deps: Services) => unknown> = {
${spreads}
};

/**
 * Lazy, memoizing service container; factories receive the container itself.
 * The host may register additional (core-provided) services via \`extra\`.
 */
export function createServices(
  extra: Record<string, (deps: Services) => unknown> = {},
): Services {
  const all: Record<string, (deps: Services) => unknown> = { ...factories, ...extra };
  const cache = new Map<string, unknown>();
  const services = new Proxy({} as Services, {
    get(_target, name) {
      if (typeof name !== "string") return undefined;
      if (!cache.has(name)) {
        const factory = all[name];
        if (!factory) {
          throw new Error(\`Unknown service "\${name}" — is its module enabled?\`);
        }
        cache.set(name, factory(services));
      }
      return cache.get(name);
    },
    has: (_target, name) => typeof name === "string" && name in all,
  });
  return services;
}
`,
  );
}

function emitEvents(writer: Writer, modules: ModuleModel[]): void {
  const declarationImports = modules
    .filter((module) => module.has.events)
    .map((module) => `import "${spec(module, "events.ts")}";`)
    .join("\n");
  const subscriberImports: string[] = [];
  const subscriberNames: string[] = [];
  for (const module of modules) {
    module.subscriberFiles.forEach((file, index) => {
      const name = `${camel(module.id)}Subscriber${index}`;
      subscriberImports.push(`import ${name} from "${spec(module, file)}";`);
      subscriberNames.push(name);
    });
  }
  writer.write(
    `${GEN}/events.ts`,
    `import type { AnySubscriberDefinition } from "@solivio/sdk";
${declarationImports ? `\n${declarationImports}` : ""}${
  subscriberImports.length > 0 ? `\n${subscriberImports.join("\n")}` : ""
}

export const subscribers: AnySubscriberDefinition[] = [${subscriberNames.join(", ")}];
`,
  );
}

function emitJobs(writer: Writer, modules: ModuleModel[]): void {
  const imports: string[] = [];
  const names: string[] = [];
  for (const module of modules) {
    module.jobFiles.forEach((file, index) => {
      const name = `${camel(module.id)}Job${index}`;
      imports.push(`import ${name} from "${spec(module, file)}";`);
      names.push(name);
    });
  }
  writer.write(
    `${GEN}/jobs.ts`,
    `import type { AnyJobDefinition } from "@solivio/sdk";
${imports.length > 0 ? `\n${imports.join("\n")}` : ""}

export const jobs: AnyJobDefinition[] = [${names.join(", ")}];
`,
  );
}

function emitAi(writer: Writer, modules: ModuleModel[]): void {
  const toolProviders = modules.filter((module) => module.has.aiTools);
  const importerProviders = modules.filter((module) => module.has.aiImporters);
  const lines: string[] = [];
  for (const module of toolProviders) {
    lines.push(
      `import { tools as ${camel(module.id)}Tools } from "${spec(module, "ai/tools.ts")}";`,
    );
  }
  for (const module of importerProviders) {
    lines.push(
      `import { importers as ${camel(module.id)}Importers } from "${spec(module, "ai/importers.ts")}";`,
    );
  }
  writer.write(
    `${GEN}/ai.ts`,
    `import type { AgentTool, AnyImporterDefinition } from "@solivio/sdk";
${lines.length > 0 ? `\n${lines.join("\n")}` : ""}

export const agentTools: AgentTool[] = [${toolProviders
      .map((module) => `...${camel(module.id)}Tools`)
      .join(", ")}];

export const importerProviders: ReadonlyArray<{
  moduleId: string;
  importer: AnyImporterDefinition;
}> = [
${importerProviders
  .map(
    (module) =>
      `  ...${camel(module.id)}Importers.map((importer) => ({ moduleId: "${module.id}", importer })),`,
  )
  .join("\n")}
];
`,
  );
}

function emitNav(writer: Writer, modules: ModuleModel[]): void {
  const providers = modules.filter((module) => module.has.nav);
  const imports = providers
    .map((module) => `import { nav as ${camel(module.id)}Nav } from "${spec(module, "nav.tsx")}";`)
    .join("\n");
  writer.write(
    `${GEN}/nav.ts`,
    `import type { NavEntry } from "@solivio/sdk";
${imports ? `\n${imports}\n` : ""}
export interface NavRegistryEntry extends NavEntry {
  moduleId: string;
}

const entries: NavRegistryEntry[] = [
${providers
  .map(
    (module) =>
      `  ...${camel(module.id)}Nav.map((entry) => ({ ...entry, moduleId: "${module.id}" })),`,
  )
  .join("\n")}
];

export const navRegistry: NavRegistryEntry[] = entries.sort(
  (a, b) => (a.order ?? 0) - (b.order ?? 0),
);
`,
  );
}

function emitSlots(writer: Writer, modules: ModuleModel[]): void {
  const providers = modules.filter((module) => module.has.slots);
  const imports = providers
    .map(
      (module) =>
        `import { slots as ${camel(module.id)}Slots } from "${spec(module, "slots.tsx")}";`,
    )
    .join("\n");
  writer.write(
    `${GEN}/slots.tsx`,
    `import type React from "react";

import type { SlotContribution, SlotContributions, SlotId, SlotPropsMap } from "@solivio/sdk";
${imports ? `\n${imports}\n` : ""}
function mergeSlots(all: SlotContributions[]): SlotContributions {
  const merged: Record<string, SlotContribution[]> = {};
  for (const contributions of all) {
    for (const [slotId, items] of Object.entries(contributions)) {
      merged[slotId] = [...(merged[slotId] ?? []), ...((items ?? []) as SlotContribution[])];
    }
  }
  for (const items of Object.values(merged)) {
    items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  return merged as SlotContributions;
}

export const slotRegistry: SlotContributions = mergeSlots([
${providers.map((module) => `  ${camel(module.id)}Slots,`).join("\n")}
]);

/**
 * Renders every contribution registered for a slot. Core code imports this
 * from "@/generated/slots"; module pages import it as "@solivio/slots"
 * (aliased here by next.config + tsconfig paths).
 */
export function Slot<K extends SlotId>({
  id,
  ...props
}: { id: K } & SlotPropsMap[K]): React.ReactNode {
  const items = (slotRegistry[id] ?? []) as ReadonlyArray<SlotContribution<K>>;
  return (
    <>
      {items.map((contribution) => (
        <contribution.component key={contribution.id} {...(props as unknown as SlotPropsMap[K])} />
      ))}
    </>
  );
}
`,
  );
}

function emitAcl(writer: Writer, modules: ModuleModel[]): void {
  const permissions = modules.flatMap((module) => module.permissions);
  const union = permissions.length > 0 ? permissions.map((p) => `"${p}"`).join(" | ") : "never";
  writer.write(
    `${GEN}/acl.ts`,
    `export type Permission = ${union};

export const allPermissions: readonly Permission[] = [${permissions
      .map((p) => `"${p}"`)
      .join(", ")}];
`,
  );
}

function emitSchema(writer: Writer, modules: ModuleModel[]): void {
  const providers = modules.filter((module) => module.has.schema);
  writer.write(
    `${GEN}/schema.ts`,
    `${providers.map((module) => `export * from "${spec(module, "data/schema.ts")}";`).join("\n")}
export {};
`,
  );
}

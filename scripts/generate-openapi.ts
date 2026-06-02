import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";

import type {
  ApiMethod,
  ApiResponseContract,
  NormalizedRouteOpenApi,
  NormalizedRouteOpenApiOperation,
} from "../apps/solivio/src/server/api/openapi";
import { apiMethods, apiTags } from "../apps/solivio/src/server/api/openapi";

type RouteModuleOpenApi = {
  openapi?: NormalizedRouteOpenApi;
};

type DiscoveredRoute = {
  filePath: string;
  methods: ApiMethod[];
  openApiPath: string;
};

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDirectory = path.join(rootDirectory, "apps/solivio/src/app/api");
const outputFile = path.join(rootDirectory, "apps/docs/public/openapi/solivio.json");

const registry = new OpenAPIRegistry();
const routes = await discoverRoutes(apiDirectory);

for (const route of routes) {
  const metadataFile = path.join(path.dirname(route.filePath), "openapi.ts");
  const metadataModule = (await import(pathToFileURL(metadataFile).href)) as RouteModuleOpenApi;
  const openapi = metadataModule.openapi;

  if (!openapi) {
    throw new Error(
      `Missing exported openapi metadata in ${path.relative(rootDirectory, metadataFile)}`,
    );
  }

  const metadataMethods = Object.keys(openapi) as ApiMethod[];
  const extraMethods = metadataMethods.filter((method) => !route.methods.includes(method));
  const missingMethods = route.methods.filter((method) => !metadataMethods.includes(method));

  if (extraMethods.length > 0 || missingMethods.length > 0) {
    throw new Error(
      [
        `OpenAPI metadata does not match route exports in ${path.relative(rootDirectory, route.filePath)}.`,
        extraMethods.length > 0 ? `Extra metadata: ${extraMethods.join(", ")}.` : null,
        missingMethods.length > 0 ? `Missing metadata: ${missingMethods.join(", ")}.` : null,
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  for (const method of route.methods) {
    const operation = openapi[method];
    if (!operation) continue;
    registerRouteOperation(route.openApiPath, method, operation);
  }
}

const generator = new OpenApiGeneratorV31(registry.definitions, {
  sortComponents: "alphabetically",
});

const document = generator.generateDocument({
  openapi: "3.1.0",
  info: {
    title: "Solivio API",
    summary: "API boundaries for Data -> AI -> Structured draft -> Review -> Send.",
    description:
      "Solivio is an open-source AI system that transforms how B2B companies create offers. The current API intentionally keeps setup simple so contributors can launch the product without external services.",
    version: "0.1.0",
    license: {
      name: "MIT",
      identifier: "MIT",
    },
  },
  servers: [
    {
      url: "/",
      description: "Solivio API origin",
    },
  ],
  tags: [...apiTags],
  security: [],
});

document.components = {
  ...document.components,
  securitySchemes: {
    ...document.components?.securitySchemes,
    sessionCookie: {
      type: "apiKey",
      in: "cookie",
      name: "better-auth.session_token",
      description: "Better Auth session cookie. Secure deployments may use a prefixed cookie name.",
    },
  },
};

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(document, null, 2)}\n`);

console.log(
  `Generated ${path.relative(rootDirectory, outputFile)} from ${routes.length} route files`,
);

async function discoverRoutes(directory: string): Promise<DiscoveredRoute[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const routes = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return discoverRoutes(entryPath);
      if (!entry.isFile() || !/^route\.tsx?$/.test(entry.name)) return [];

      const source = await readFile(entryPath, "utf8");
      const methods = exportedMethods(source);
      if (methods.length === 0) return [];

      return [
        {
          filePath: entryPath,
          methods,
          openApiPath: toOpenApiPath(entryPath),
        },
      ];
    }),
  );

  return routes.flat().sort((a, b) => a.openApiPath.localeCompare(b.openApiPath));
}

function exportedMethods(source: string): ApiMethod[] {
  return apiMethods.filter((method) => {
    const functionExport = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`);
    const constExport = new RegExp(`export\\s+const\\s+${method}\\b`);
    const destructuredExport = new RegExp(`export\\s+const\\s*\\{[^}]*\\b${method}\\b[^}]*\\}`);
    return (
      functionExport.test(source) || constExport.test(source) || destructuredExport.test(source)
    );
  });
}

function toOpenApiPath(routeFilePath: string) {
  const routeDirectory = path.dirname(routeFilePath);
  const relativeRouteDirectory = path.relative(apiDirectory, routeDirectory);
  const segments = relativeRouteDirectory
    .split(path.sep)
    .filter(Boolean)
    .map((segment) => {
      const optionalCatchAll = /^\[\[\.\.\.(.+)\]\]$/.exec(segment);
      if (optionalCatchAll) return `{${optionalCatchAll[1]}}`;

      const catchAll = /^\[\.\.\.(.+)\]$/.exec(segment);
      if (catchAll) return `{${catchAll[1]}}`;

      const dynamic = /^\[(.+)\]$/.exec(segment);
      if (dynamic) return `{${dynamic[1]}}`;

      return segment;
    });

  return `/api${segments.length > 0 ? `/${segments.join("/")}` : ""}`;
}

function registerRouteOperation(
  openApiPath: string,
  method: ApiMethod,
  operation: NormalizedRouteOpenApiOperation,
) {
  const request = {
    ...(operation.requestParams ? { params: operation.requestParams } : {}),
    ...(operation.requestQuery ? { query: operation.requestQuery } : {}),
    ...(operation.requestBody
      ? {
          body: {
            description: operation.requestBody.description,
            required: operation.requestBody.required ?? true,
            content: {
              "application/json": {
                schema: operation.requestBody.schema,
              },
            },
          },
        }
      : {}),
  };

  registry.registerPath({
    method: method.toLowerCase() as Lowercase<ApiMethod>,
    path: openApiPath,
    operationId: operation.operationId,
    summary: operation.summary,
    description: operation.description,
    tags: operation.tags,
    ...(operation.requiresAuth ? { security: [{ sessionCookie: [] }] } : {}),
    ...(Object.keys(request).length > 0 ? { request } : {}),
    responses: toOpenApiResponses(operation.responses),
  });
}

function toOpenApiResponses(responses: Record<number, ApiResponseContract>) {
  return Object.fromEntries(
    Object.entries(responses).map(([status, response]) => [
      status,
      response.content
        ? {
            description: response.description,
            content: Object.fromEntries(
              Object.entries(response.content).map(([mediaType, content]) => [
                mediaType,
                content.schema ? { schema: content.schema } : {},
              ]),
            ),
          }
        : response.schema
          ? {
              description: response.description,
              content: {
                "application/json": {
                  schema: response.schema,
                },
              },
            }
          : {
              description: response.description,
            },
    ]),
  );
}

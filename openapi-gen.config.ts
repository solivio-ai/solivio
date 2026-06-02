import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { defineConfig } from "next-openapi-gen";

const apiDirectory = "apps/solivio/src/app/api";
const apiMethods = ["GET", "POST", "PATCH", "DELETE"] as const;
const outputFile = "solivio.json";
const outputDirectory = "apps/docs/public/openapi";

type ApiMethod = (typeof apiMethods)[number];
type OpenApiResponse = {
  content?: Record<string, { schema?: Record<string, unknown> }>;
  description?: string;
};
type OpenApiOperation = {
  requestBody?: { required?: boolean };
  responses?: Record<string, OpenApiResponse>;
  security?: Array<Record<string, string[]>>;
};
type OpenApiPathItem = Partial<Record<Lowercase<ApiMethod>, OpenApiOperation>>;
type OpenApiDocument = {
  components?: {
    schemas?: Record<string, Record<string, unknown>>;
    securitySchemes?: Record<string, Record<string, unknown>>;
  };
  paths?: Record<string, OpenApiPathItem>;
};

const apiTags = [
  { name: "Auth", description: "Better Auth session and identity routes." },
  { name: "System", description: "Operational status and readiness checks." },
  { name: "Customers", description: "Customer search, creation, and import endpoints." },
  { name: "Products", description: "Product candidate data used by matching." },
  { name: "Offers", description: "Draft offer generation boundaries." },
  { name: "Chat", description: "AI chat streams and persisted offer review conversations." },
  { name: "Documents", description: "PDF offer rendering endpoints." },
] as const;

export default defineConfig({
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
  apiDir: apiDirectory,
  routerType: "app",
  schemaDir: ["apps/solivio/src/server/api/schemas", "apps/solivio/src/features/offer-pdf/lib"],
  schemaType: "zod",
  excludeSchemas: ["*Schema"],
  outputDir: outputDirectory,
  outputFile,
  docsUrl: "api",
  includeOpenApiRoutes: true,
  ignoreRoutes: [],
  ui: "none",
  hooks: {
    documentBuilt({ document }) {
      const openApiDocument = document as OpenApiDocument;

      prefixApiPaths(openApiDocument);
      addCoreComponents(openApiDocument);
      addBetterAuthRoute(openApiDocument);
      addDefaultAuthResponses(openApiDocument);
      normalizeRequestBodies(openApiDocument);
      normalizeBinaryResponses(openApiDocument);
      sortPaths(openApiDocument);
      assertRouteCoverage(openApiDocument);
    },
  },
});

function prefixApiPaths(document: OpenApiDocument) {
  document.paths = Object.fromEntries(
    Object.entries(document.paths ?? {}).map(([routePath, operations]) => [
      routePath === "/api" || routePath.startsWith("/api/") ? routePath : `/api${routePath}`,
      operations,
    ]),
  );
}

function addCoreComponents(document: OpenApiDocument) {
  document.components ??= {};
  document.components.schemas ??= {};
  document.components.securitySchemes = {
    ...document.components.securitySchemes,
    sessionCookie: {
      type: "apiKey",
      in: "cookie",
      name: "better-auth.session_token",
      description: "Better Auth session cookie. Secure deployments may use a prefixed cookie name.",
    },
  };
  document.components.schemas.UnauthorizedResponse ??= {
    type: "object",
    properties: {
      error: {
        type: "string",
      },
    },
    required: ["error"],
    additionalProperties: false,
    description: "Returned when no valid Better Auth session is present.",
  };
}

function addBetterAuthRoute(document: OpenApiDocument) {
  document.paths ??= {};
  const parameters = [
    {
      name: "all",
      in: "path",
      required: true,
      schema: { type: "string" },
    },
  ];

  document.paths["/api/auth/{all}"] = {
    get: {
      operationId: "handleBetterAuthGet",
      summary: "Handle Better Auth GET route",
      description:
        "Catch-all route delegated to Better Auth for session reads, provider callbacks, and other auth GET flows.",
      tags: ["Auth"],
      parameters,
      responses: {
        "200": { description: "Better Auth handled the GET request." },
        "400": { description: "Better Auth rejected the request." },
      },
    } as OpenApiOperation,
    post: {
      operationId: "handleBetterAuthPost",
      summary: "Handle Better Auth POST route",
      description:
        "Catch-all route delegated to Better Auth for sign-in, sign-up, sign-out, and other auth POST flows.",
      tags: ["Auth"],
      parameters,
      responses: {
        "200": { description: "Better Auth handled the POST request." },
        "400": { description: "Better Auth rejected the request." },
      },
    } as OpenApiOperation,
  };
}

function addDefaultAuthResponses(document: OpenApiDocument) {
  for (const operation of operations(document)) {
    const usesSessionCookie = operation.security?.some(
      (requirement) => "sessionCookie" in requirement,
    );
    if (!usesSessionCookie) continue;

    operation.responses ??= {};
    operation.responses["401"] ??= {
      description: "No valid Better Auth session was present.",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/UnauthorizedResponse" },
        },
      },
    };
  }
}

function normalizeRequestBodies(document: OpenApiDocument) {
  for (const operation of operations(document)) {
    if (operation.requestBody && operation.requestBody.required === undefined) {
      operation.requestBody.required = true;
    }
  }
}

function normalizeBinaryResponses(document: OpenApiDocument) {
  for (const operation of operations(document)) {
    for (const response of Object.values(operation.responses ?? {})) {
      const pdfContent = response.content?.["application/pdf"];
      if (pdfContent) {
        pdfContent.schema = { type: "string", format: "binary" };
      }
    }
  }
}

function sortPaths(document: OpenApiDocument) {
  document.paths = Object.fromEntries(
    Object.entries(document.paths ?? {}).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function assertRouteCoverage(document: OpenApiDocument) {
  const expected = new Set(
    discoverRoutes(apiDirectory).flatMap((route) =>
      route.methods.map((method) => `${method} ${route.openApiPath}`),
    ),
  );
  const actual = new Set(
    Object.entries(document.paths ?? {}).flatMap(([routePath, pathItem]) =>
      Object.keys(pathItem)
        .filter((method): method is Lowercase<ApiMethod> =>
          apiMethods.includes(method.toUpperCase() as ApiMethod),
        )
        .map((method) => `${method.toUpperCase()} ${routePath}`),
    ),
  );

  const missing = [...expected].filter((operation) => !actual.has(operation));
  const extra = [...actual].filter((operation) => !expected.has(operation));

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      [
        "Generated OpenAPI operations do not match exported API route methods.",
        missing.length > 0 ? `Missing: ${missing.join(", ")}.` : null,
        extra.length > 0 ? `Extra: ${extra.join(", ")}.` : null,
      ]
        .filter(Boolean)
        .join(" "),
    );
  }
}

function operations(document: OpenApiDocument) {
  return Object.values(document.paths ?? {}).flatMap((pathItem) =>
    Object.values(pathItem).filter((operation): operation is OpenApiOperation =>
      Boolean(operation),
    ),
  );
}

function discoverRoutes(directory: string) {
  const routes = readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return discoverRoutes(entryPath);
    if (!entry.isFile() || !/^route\.tsx?$/.test(entry.name)) return [];

    const source = readFileSync(entryPath, "utf8");
    const methods = exportedMethods(source);
    if (methods.length === 0) return [];

    return [
      {
        filePath: entryPath,
        methods,
        openApiPath: toOpenApiPath(entryPath),
      },
    ];
  });

  return routes.sort((left, right) => left.openApiPath.localeCompare(right.openApiPath));
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

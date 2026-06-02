import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateProject } from "next-openapi-gen";

import { createAuth } from "../apps/solivio/src/server/auth/createAuth";

const generatedDirectory = ".openapi-gen";
const betterAuthFragmentFile = path.join(generatedDirectory, "better-auth.json");
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type OpenApiOperation = {
  operationId?: string;
  parameters?: unknown[];
  requestBody?: unknown;
  security?: Array<Record<string, string[]>>;
  tags?: string[];
};

type OpenApiPathItem = Record<string, OpenApiOperation | unknown>;

const publicAuthOperations = new Set([
  "GET /account-info",
  "GET /callback/{id}",
  "POST /callback/{id}",
  "GET /delete-user/callback",
  "GET /error",
  "GET /ok",
  "POST /request-password-reset",
  "POST /reset-password",
  "GET /reset-password/{token}",
  "POST /sign-in/email",
  "POST /sign-in/social",
  "POST /sign-in/username",
  "POST /sign-up/email",
  "GET /verify-email",
]);

process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.chdir(repositoryRoot);

await writeBetterAuthFragment();
await generateProject({ configPath: "openapi-gen.config.ts" });

async function writeBetterAuthFragment() {
  const schema = await createAuth().api.generateOpenAPISchema();
  const fragment = {
    components: {
      schemas: schema.components?.schemas,
    },
    paths: Object.fromEntries(
      Object.entries(schema.paths ?? {}).map(([routePath, pathItem]) => [
        `/api/auth${routePath}`,
        normalizeAuthPathItem(routePath, pathItem as OpenApiPathItem),
      ]),
    ),
  };

  await mkdir(generatedDirectory, { recursive: true });
  await writeFile(betterAuthFragmentFile, `${JSON.stringify(fragment, null, 2)}\n`);
}

function normalizeAuthPathItem(routePath: string, pathItem: OpenApiPathItem) {
  return Object.fromEntries(
    Object.entries(pathItem).map(([method, operation]) => {
      if (!isHttpOperation(operation)) return [method, operation];

      operation.tags = ["Auth"];
      operation.parameters ??= [];

      if (isPublicAuthOperation(method, routePath)) {
        delete operation.security;
      } else {
        operation.security = [{ sessionCookie: [] }];
      }

      if (isEmptyJsonRequestBody(operation.requestBody)) {
        delete operation.requestBody;
      }

      return [method, operation];
    }),
  );
}

function isHttpOperation(value: unknown): value is OpenApiOperation {
  return typeof value === "object" && value !== null;
}

function isPublicAuthOperation(method: string, routePath: string) {
  return publicAuthOperations.has(`${method.toUpperCase()} ${routePath}`);
}

function isEmptyJsonRequestBody(requestBody: unknown) {
  if (typeof requestBody !== "object" || requestBody === null) return false;

  const body = requestBody as {
    content?: Record<string, { schema?: { properties?: Record<string, unknown> } }>;
  };
  const properties = body.content?.["application/json"]?.schema?.properties;
  return properties !== undefined && Object.keys(properties).length === 0;
}

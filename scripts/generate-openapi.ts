import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";

import type { ApiResponseContract } from "../apps/solivio/src/server/api/contracts";
import { apiContracts, apiTags } from "../apps/solivio/src/server/api/contracts";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputFile = path.join(rootDirectory, "apps/docs/public/openapi/solivio.json");

const registry = new OpenAPIRegistry();

for (const contract of apiContracts) {
  const request = {
    ...(contract.requestParams ? { params: contract.requestParams } : {}),
    ...(contract.requestQuery ? { query: contract.requestQuery } : {}),
    ...(contract.requestBody
      ? {
          body: {
            description: contract.requestBody.description,
            required: contract.requestBody.required ?? true,
            content: {
              "application/json": {
                schema: contract.requestBody.schema,
              },
            },
          },
        }
      : {}),
  };

  registry.registerPath({
    method: contract.method,
    path: contract.path,
    operationId: contract.operationId,
    summary: contract.summary,
    description: contract.description,
    tags: contract.tags,
    ...(contract.requiresAuth ? { security: [{ sessionCookie: [] }] } : {}),
    ...(Object.keys(request).length > 0 ? { request } : {}),
    responses: toOpenApiResponses(contract.responses),
  });
}

const generator = new OpenApiGeneratorV31(registry.definitions, {
  sortComponents: "alphabetically",
});

const document = generator.generateDocument({
  openapi: "3.1.0",
  info: {
    title: "Solivio API",
    summary: "API boundaries for Data → AI → Structured draft → Review → Send.",
    description:
      "Solivio is an open-source AI-assisted quoting system. Its API combines core system routes with enabled module routes for catalog, customers, offers, chat, import, and operational workflows.",
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

console.log(`Generated ${path.relative(rootDirectory, outputFile)}`);

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

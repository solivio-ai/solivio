import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  OpenAPIRegistry,
  OpenApiGeneratorV31
} from "@asteasolutions/zod-to-openapi";

import {
  apiContracts,
  apiTags,
  type ApiResponseContract
} from "../apps/solivio/src/server/api/contracts";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputFile = path.join(rootDirectory, "apps/docs/public/openapi/solivio.json");

const registry = new OpenAPIRegistry();

for (const contract of apiContracts) {
  registry.registerPath({
    method: contract.method,
    path: contract.path,
    operationId: contract.operationId,
    summary: contract.summary,
    description: contract.description,
    tags: contract.tags,
    ...(contract.requestBody
      ? {
          request: {
            body: {
              description: contract.requestBody.description,
              required: contract.requestBody.required ?? true,
              content: {
                "application/json": {
                  schema: contract.requestBody.schema
                }
              }
            }
          }
        }
      : {}),
    responses: toOpenApiResponses(contract.responses)
  });
}

const generator = new OpenApiGeneratorV31(registry.definitions, {
  sortComponents: "alphabetically"
});

const document = generator.generateDocument({
  openapi: "3.1.0",
  info: {
    title: "Solivio API",
    summary: "API boundaries for the Solivio sales offer workflow demo.",
    description:
      "Solivio turns raw customer input into extracted requirements, product matches, and a draft offer that a salesperson can review. The current API intentionally uses mock data so contributors can launch the product without external services.",
    version: "0.1.0",
    license: {
      name: "MIT",
      identifier: "MIT"
    }
  },
  servers: [
    {
      url: "/",
      description: "Solivio API origin"
    }
  ],
  tags: [...apiTags],
  security: []
});

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(document, null, 2)}\n`);

console.log(`Generated ${path.relative(rootDirectory, outputFile)}`);

function toOpenApiResponses(responses: Record<number, ApiResponseContract>) {
  return Object.fromEntries(
    Object.entries(responses).map(([status, response]) => [
      status,
      response.schema
        ? {
            description: response.description,
            content: {
              "application/json": {
                schema: response.schema
              }
            }
          }
        : {
            description: response.description
          }
    ])
  );
}

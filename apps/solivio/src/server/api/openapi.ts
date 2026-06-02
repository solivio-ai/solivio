import type { ZodObject, ZodType } from "zod";

import {
  apiErrorOrPlainErrorSchema,
  errorResponseSchema,
  plainErrorResponseSchema,
  unauthorizedResponseSchema,
} from "./schemas";

export const apiTags = [
  { name: "Auth", description: "Better Auth session and identity routes." },
  { name: "System", description: "Operational status and readiness checks." },
  { name: "Customers", description: "Customer search, creation, and import endpoints." },
  { name: "Products", description: "Product candidate data used by matching." },
  { name: "Offers", description: "Draft offer generation boundaries." },
  { name: "Chat", description: "AI chat streams and persisted offer review conversations." },
  { name: "Documents", description: "PDF offer rendering endpoints." },
] as const;

export const apiMethods = ["GET", "POST", "PATCH", "DELETE"] as const;

export type ApiMethod = (typeof apiMethods)[number];
export type ApiRouteTag = (typeof apiTags)[number]["name"];

export type ApiContentContract = Record<string, { schema?: ZodType }>;

export type ApiResponseContract = {
  content?: ApiContentContract;
  description: string;
  schema?: ZodType;
};

export type ApiRawResponseContract = ApiResponseContract | string;

export type ApiRequestBodyContract = {
  description: string;
  required?: boolean;
  schema: ZodType;
};

export type RouteOpenApiOperation = {
  description?: string;
  operationId: string;
  requestBody?: ApiRequestBodyContract;
  requestParams?: ZodObject;
  requestQuery?: ZodObject;
  requiresAuth?: boolean;
  responses: Record<number, ApiRawResponseContract>;
  summary: string;
  tags: ApiRouteTag[];
};

export type NormalizedRouteOpenApiOperation = Omit<RouteOpenApiOperation, "responses"> & {
  responses: Record<number, ApiResponseContract>;
};

export type RouteOpenApi = Partial<Record<ApiMethod, RouteOpenApiOperation>>;
export type NormalizedRouteOpenApi = Partial<Record<ApiMethod, NormalizedRouteOpenApiOperation>>;

const defaultErrorSchemas: Partial<Record<number, ZodType>> = {
  400: errorResponseSchema,
  401: unauthorizedResponseSchema,
  403: apiErrorOrPlainErrorSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
  413: plainErrorResponseSchema,
  422: errorResponseSchema,
  500: apiErrorOrPlainErrorSchema,
};

export function defineRouteOpenApi(routeOpenApi: RouteOpenApi): NormalizedRouteOpenApi {
  return Object.fromEntries(
    Object.entries(routeOpenApi).map(([method, operation]) => [
      method,
      normalizeOperation(operation),
    ]),
  ) as NormalizedRouteOpenApi;
}

export function pdfResponse(description: string): ApiResponseContract {
  return {
    description,
    content: {
      "application/pdf": {},
    },
  };
}

export function sseResponse(description: string): ApiResponseContract {
  return {
    description,
    content: {
      "text/event-stream": {},
    },
  };
}

function normalizeOperation(operation: RouteOpenApiOperation): NormalizedRouteOpenApiOperation {
  const responses = normalizeResponses(operation.responses);
  return {
    ...operation,
    responses:
      operation.requiresAuth === true
        ? {
            ...responses,
            401: {
              description: "No valid Better Auth session was present.",
              schema: unauthorizedResponseSchema,
            },
          }
        : responses,
  };
}

function normalizeResponses(
  responses: Record<number, ApiRawResponseContract>,
): Record<number, ApiResponseContract> {
  return Object.fromEntries(
    Object.entries(responses).map(([codeString, response]) => {
      const code = Number(codeString);
      if (typeof response === "string") {
        const schema = defaultErrorSchemas[code];
        return [
          codeString,
          schema ? { description: response, schema } : { description: response },
        ] as const;
      }

      return [codeString, response] as const;
    }),
  );
}

import type { ZodObject, ZodType } from "zod";
import { z } from "zod";

// ── Contract types ─────────────────────────────────────────────────────────────

export type ApiMethod = "delete" | "get" | "patch" | "post";

export type ApiContentContract = Record<string, { schema?: ZodType }>;

export type ApiResponseContract = {
  content?: ApiContentContract;
  description: string;
  schema?: ZodType;
};

export type ApiRequestBodyContract = {
  description: string;
  required?: boolean;
  schema: ZodType;
};

export type ApiContract = {
  description?: string;
  method: ApiMethod;
  operationId: string;
  path: string;
  requestParams?: ZodObject;
  requestQuery?: ZodObject;
  requestBody?: ApiRequestBodyContract;
  responses: Record<number, ApiResponseContract>;
  requiresAuth?: boolean;
  summary: string;
  tags: string[];
};

// ── Tags ───────────────────────────────────────────────────────────────────────

export const apiTags = [
  { name: "Auth", description: "Better Auth session and identity routes." },
  { name: "System", description: "Operational status and readiness checks." },
  { name: "Customers", description: "Customer search, creation, and import endpoints." },
  { name: "Products", description: "Product candidate data used by matching." },
  { name: "Requests", description: "Customer request intake and requirement extraction." },
  { name: "Offers", description: "Draft offer generation boundaries." },
  { name: "Chat", description: "AI chat streams and persisted offer review conversations." },
  { name: "Documents", description: "PDF offer rendering endpoints." },
] as const;

// ── Primitives ─────────────────────────────────────────────────────────────────

export const availabilitySchema = z
  .enum(["available", "limited", "unavailable"])
  .meta({ id: "Availability" });

export const currencySchema = z.string().min(1).meta({ id: "Currency" });

// ── Error envelopes ────────────────────────────────────────────────────────────

export const errorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        issues: z.array(z.string()).optional(),
      })
      .strict(),
  })
  .strict()
  .meta({
    id: "ErrorResponse",
    description: "Standard API error payload.",
  });

export const unauthorizedResponseSchema = z
  .object({
    error: z.string(),
  })
  .strict()
  .meta({
    id: "UnauthorizedResponse",
    description: "Returned when no valid Better Auth session is present.",
  });

export const plainErrorResponseSchema = z.object({ error: z.string() }).strict().meta({
  id: "PlainErrorResponse",
  description: "Plain error payload (single error string).",
});

// ── Health ─────────────────────────────────────────────────────────────────────

export const databaseStatusSchema = z
  .discriminatedUnion("status", [
    z.object({ status: z.literal("not-configured") }).strict(),
    z
      .object({
        status: z.literal("reachable"),
        source: z.enum(["env", "development-default"]),
        serverVersion: z.string(),
        vectorVersion: z.string(),
      })
      .strict(),
    z
      .object({
        status: z.literal("unreachable"),
        message: z.string(),
      })
      .strict(),
  ])
  .meta({
    id: "DatabaseStatus",
    description: "Database readiness information returned by the health endpoint.",
  });

export const healthResponseSchema = z
  .object({
    app: z.literal("solivio"),
    status: z.literal("ok"),
    database: databaseStatusSchema,
    timestamp: z.string().datetime(),
  })
  .strict()
  .meta({ id: "HealthResponse" });

// ── Route catalog helpers ─────────────────────────────────────────────────────

const defaultErrorSchemas: Partial<Record<number, ZodType>> = {
  400: errorResponseSchema,
  401: unauthorizedResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
  500: errorResponseSchema,
};

export type ApiRouteTag = (typeof apiTags)[number]["name"];

export type ApiRawResponseContract = ApiResponseContract | string;

export type RawRouteInput = Omit<ApiContract, "requiresAuth" | "responses" | "tags"> & {
  responses: Record<number, ApiRawResponseContract>;
};

export type RouteGroupOptions = {
  requiresAuth?: boolean;
  tag: ApiRouteTag;
};

function normalizeResponses(
  responses: Record<number, ApiRawResponseContract>,
): Record<number, ApiResponseContract> {
  return Object.fromEntries(
    Object.entries(responses).map(([codeStr, raw]) => {
      const code = Number(codeStr);
      if (typeof raw === "string") {
        const inferred = defaultErrorSchemas[code];
        return [
          codeStr,
          inferred ? { description: raw, schema: inferred } : { description: raw },
        ] as const;
      }
      return [codeStr, raw] as const;
    }),
  );
}

/** Apply shared tag/metadata to a batch of routes; merges 401 after responses so overrides win. */
export function routeGroup(options: RouteGroupOptions, routes: RawRouteInput[]): ApiContract[] {
  return routes.map((route) => {
    const normalizedResponses = normalizeResponses(route.responses);
    const responses =
      options.requiresAuth === true
        ? ({
            ...normalizedResponses,
            401: {
              description: "No valid Better Auth session was present.",
              schema: unauthorizedResponseSchema,
            },
          } satisfies Record<number, ApiResponseContract>)
        : normalizedResponses;
    return {
      ...route,
      tags: [options.tag],
      responses,
      ...(options.requiresAuth === true && { requiresAuth: true }),
    };
  });
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

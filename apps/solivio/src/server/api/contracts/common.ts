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

export const currencySchema = z.enum(["PLN", "EUR"]).meta({ id: "Currency" });

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

export const plainErrorResponseSchema = z
  .object({ error: z.string() })
  .strict()
  .meta({
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

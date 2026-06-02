import { z } from "zod";

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

export const apiErrorOrPlainErrorSchema = z
  .union([errorResponseSchema, plainErrorResponseSchema])
  .meta({
    id: "ApiErrorOrPlainErrorResponse",
    description: "Either the structured Solivio error envelope or a plain error payload.",
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

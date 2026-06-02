import { z } from "zod";

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

export const plainErrorResponseSchema = z.object({ error: z.string() }).strict().meta({
  id: "PlainErrorResponse",
  description: "Plain error payload (single error string).",
});

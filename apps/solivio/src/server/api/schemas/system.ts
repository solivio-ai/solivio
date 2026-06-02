import { z } from "zod";

export const authPathParamsSchema = z
  .object({
    all: z.string(),
  })
  .strict()
  .meta({
    id: "AuthPathParams",
    description: "Catch-all path segment delegated to Better Auth.",
  });

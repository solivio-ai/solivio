import { z } from "zod";

export const offerValidationResultSchema = z
  .object({
    verdict: z.enum(["pass", "partial", "fail"]),
    summary: z.string().describe("1-2 sentence overall assessment"),
    issues: z.array(z.string()).describe("Specific problems found in the offer"),
    missingRequirements: z.array(z.string()).describe("Customer requirements not addressed"),
  })
  .meta({
    id: "OfferValidationResult",
    description: "AI validation result for a generated offer against the source request.",
  });

export const offerValidationResponseSchema = z
  .object({
    validation: offerValidationResultSchema,
  })
  .strict()
  .meta({ id: "OfferValidationResponse" });

export type OfferValidationResult = z.infer<typeof offerValidationResultSchema>;

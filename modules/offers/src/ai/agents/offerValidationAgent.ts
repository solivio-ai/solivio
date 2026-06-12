import "server-only";

import { Agent } from "@voltagent/core";
import { Output } from "ai";
import { z } from "zod";

import { getModelFor } from "./modelConfig.ts";
import { voltOpsClient } from "./voltOpsClient.ts";

const VALIDATION_INSTRUCTIONS = `
You are a quality control agent for B2B electrical equipment offers.

Given a customer request and the current offer line items, determine if the offer satisfies the customer's requirements.

Rules:
- Check every product or category the customer mentioned is present in the offer.
- Check quantities match what was requested (or note if unclear).
- Brand substitutions are acceptable unless the customer explicitly named a brand.
- Functional equivalents count as a match (e.g. "push-in connector" matched by any brand's push-in connector).
- If a product is in "unmatched" (not found in catalog), treat it as missing.

Output fields — use them STRICTLY as defined:
- "missingRequirements": ONLY items that have NO matching product in the offer at all. If a product is present in the offer, do NOT put it here, even if imperfect.
- "issues": minor concerns about products that ARE present (wrong quantity, approximate match, brand substitution, etc.). Do NOT duplicate entries from missingRequirements.
- "summary": 1–2 sentence overall assessment.

Verdict:
- "pass": all requirements satisfied, no missing products
- "partial": most requirements satisfied but some gaps or approximate matches
- "fail": one or more significant requirements are completely missing from the offer

Respond in the same language as the customer request (Polish if request is in Polish).
`.trim();

export const offerValidationResultSchema = z.object({
  verdict: z.enum(["pass", "partial", "fail"]),
  summary: z.string().describe("1–2 sentence overall assessment"),
  issues: z.array(z.string()).describe("Specific problems found in the offer"),
  missingRequirements: z.array(z.string()).describe("Customer requirements not addressed"),
});

export type OfferValidationResult = z.infer<typeof offerValidationResultSchema>;

type OfferItem = {
  name: string;
  sku?: string;
  quantity: number;
};

export async function validateOfferWithAgent(
  clientRequest: string,
  items: OfferItem[],
  unmatched: string[],
): Promise<OfferValidationResult> {
  const agent = new Agent({
    name: "offer-validation-agent",
    instructions: VALIDATION_INSTRUCTIONS,
    model: getModelFor("offerValidation"),
    voltOpsClient,
  });

  const itemsSummary = items
    .map((item) => `- ${item.name} (SKU: ${item.sku ?? "N/A"}), qty: ${item.quantity}`)
    .join("\n");

  const unmatchedSummary =
    unmatched.length > 0
      ? `\nNot found in catalog (unmatched):\n${unmatched.map((u) => `- ${u}`).join("\n")}`
      : "";

  const message = [
    `Customer request:\n${clientRequest}`,
    `\nCurrent offer items:\n${itemsSummary}`,
    unmatchedSummary,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await agent.generateText(message, {
    output: Output.object({ schema: offerValidationResultSchema }),
  });

  return offerValidationResultSchema.parse(result.output);
}

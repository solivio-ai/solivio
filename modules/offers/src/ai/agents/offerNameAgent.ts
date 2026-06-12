import "server-only";

import { Agent } from "@voltagent/core";
import { Output } from "ai";
import { z } from "zod";

import { getModelFor } from "./modelConfig.ts";
import { voltOpsClient } from "./voltOpsClient.ts";

const OFFER_NAME_INSTRUCTIONS = `
Generate a concise, descriptive offer name based on the client request.

Rules:
- Write the name in the SAME LANGUAGE as the client request.
- Keep it short (max 8 words).
- Describe what the offer is about (products, use case, or request theme).
- Do not include person names, company names, or "Customer:" labels in the title.
`.trim();

const offerNameOutputSchema = z.object({
  name: z.string().describe("A short, descriptive offer name (max 8 words)"),
});

// Created lazily: model resolution goes through the SDK runtime, which is
// only initialized at boot (never during build-time page-data collection).
let offerNameAgentInstance: Agent | undefined;
function offerNameAgent(): Agent {
  offerNameAgentInstance ??= new Agent({
    name: "offer-name-agent",
    instructions: OFFER_NAME_INSTRUCTIONS,
    model: getModelFor("offerName"),
    voltOpsClient,
  });
  return offerNameAgentInstance;
}

export async function generateOfferName(
  clientRequest: string,
  customerName?: string,
): Promise<string> {
  const userMessage = [
    customerName ? `Customer: ${customerName}.` : "",
    `Request: ${clientRequest}`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await offerNameAgent().generateText(userMessage, {
    output: Output.object({ schema: offerNameOutputSchema }),
  });

  const parsed = offerNameOutputSchema.parse(result.output);
  const trimmed = parsed.name.trim();
  return trimmed.length > 0 ? trimmed : "Draft";
}

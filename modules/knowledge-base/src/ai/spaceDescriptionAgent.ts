import "server-only";

// Uses VoltAgent for consistency with the rest of the codebase.
// Can be swapped for a direct `generateText` call from the AI SDK if the
// VoltAgent dependency is ever removed from this module.

import { Agent } from "@voltagent/core";
import { Output } from "ai";
import { z } from "zod";

import { getAi } from "@solivio/sdk/runtime";

const INSTRUCTIONS = `
You generate a short description for a knowledge base space based on its article titles.
The description helps an AI agent decide whether to search this space for a given topic.

Rules:
- Maximum 280 characters.
- Write in English.
- Focus on WHAT topics and product types the space covers.
- Include key terms an agent might search for (e.g. product names, regulations, installation concepts).
- Do not start with "This space" or "Contains" — go straight to the content summary.
`.trim();

const outputSchema = z.object({
  description: z.string().max(280).describe("Short space description, max 280 characters"),
});

let agentInstance: Agent | undefined;
function agent(): Agent {
  agentInstance ??= new Agent({
    name: "space-description-agent",
    instructions: INSTRUCTIONS,
    // Reuses the offerName role (cheap, short-output model) — appropriate for
    // a simple summarization task with no tool calls.
    model: getAi().modelFor("offerName"),
  });
  return agentInstance;
}

export async function generateSpaceDescription(
  spaceName: string,
  articleTitles: string[],
): Promise<string> {
  if (articleTitles.length === 0) return "";

  const prompt = `Space name: ${spaceName}\nArticles:\n${articleTitles.map((t) => `- ${t}`).join("\n")}`;

  const result = await agent().generateText(prompt, {
    output: Output.object({ schema: outputSchema }),
  });

  const parsed = outputSchema.parse(result.output);
  return parsed.description.trim().slice(0, 280);
}

import { z } from "zod";

import type { AgentTool } from "@solivio/sdk";
import { defineAgentTool } from "@solivio/sdk";

import { expandProjectRequest } from "../server/expandProjectRequest.ts";

const expandProjectRequestTool = defineAgentTool({
  name: "expand_project_request",
  agents: ["offer-generation-agent", "chat-agent"],
  description:
    "Expands a PROJECT-style request — the customer describes something to build, equip, renovate " +
    "or install, or names a scope of work, instead of listing concrete products — into an " +
    "approximate item list grounded in the knowledge base. Pass the full original request text. " +
    "Returns items (phrase, bilingual search query, SKU when the knowledge base names one, " +
    "estimated quantity with unit and calculation basis, required flag), assumptions, open " +
    "questions for the customer and the knowledge-base articles used. Feed the items to " +
    "search_products. Do NOT use it for requests that already list products.",
  parameters: z.object({
    request: z.string().min(1).describe("The full customer request, verbatim"),
  }),
  execute: async (input) => expandProjectRequest(input.request),
});

export const tools: AgentTool[] = [expandProjectRequestTool];

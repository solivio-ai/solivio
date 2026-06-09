import "server-only";

import { createTool } from "@voltagent/core";
import type { z } from "zod";

import type { AgentTool, AgentToolContext } from "@solivio/sdk";

export const CONTEXT_KEY_CUSTOMER_ID = Symbol("solivio.customerId");
export const CONTEXT_KEY_OFFER_ID = Symbol("solivio.offerId");

/** Adapt an SDK AgentTool (framework-agnostic) into a Voltagent tool. */
export function toVoltagentTool(tool: AgentTool) {
  return createTool({
    name: tool.name,
    description: tool.description,
    // SDK tools type parameters as StandardSchemaV1; module authors supply Zod,
    // which Voltagent consumes. Cast at this single adaptation boundary.
    parameters: tool.parameters as unknown as z.ZodType,
    execute: async (args, options) => {
      const ctxMap = options?.context;
      const toolContext: AgentToolContext = {
        customerId: (ctxMap?.get(CONTEXT_KEY_CUSTOMER_ID) as string | null | undefined) ?? null,
        offerId: (ctxMap?.get(CONTEXT_KEY_OFFER_ID) as string | null | undefined) ?? null,
      };
      return tool.execute(args, toolContext);
    },
  });
}

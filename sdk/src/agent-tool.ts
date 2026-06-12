/**
 * Agent tools are capabilities AI agents can call during a pipeline run.
 * The agent decides whether to invoke them based on intent.
 * Examples: search_catalog, lookup_industry_standard, recall_instance_memory
 *
 * `parameters` (and optional `outputSchema`) are Standard Schema v1 values, so
 * a module supplies its own schema library (e.g. Zod). The tool stays decoupled
 * from the core's agent-flow framework — the core adapts it at wiring time.
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";

/** Named agents that modules may contribute tools to. */
export type AgentId =
  | "chat-agent"
  | "offer-generation-agent"
  | "requirement-extraction-agent"
  | "validation-agent"
  | "offer-name-agent";

export const AGENT_IDS: AgentId[] = [
  "chat-agent",
  "offer-generation-agent",
  "requirement-extraction-agent",
  "validation-agent",
  "offer-name-agent",
];

/**
 * Request-scoped data the core fills before calling a tool's execute.
 * Modules must not ask the LLM to supply these — the core injects them.
 */
export interface AgentToolContext {
  /** DB id of the customer in scope for this request. Null when unknown. */
  customerId?: string | null;
  /** DB id of the offer being reviewed, if applicable. */
  offerId?: string | null;
}

export interface AgentTool<
  TParams extends StandardSchemaV1 = StandardSchemaV1,
  TOutput extends StandardSchemaV1 = StandardSchemaV1,
> {
  name: string;
  description: string;
  /** Which named agents this tool should be wired into. */
  agents: AgentId[];
  parameters: TParams;
  /** Optional output schema. When omitted, the core does not constrain output. */
  outputSchema?: TOutput;
  execute: (
    input: StandardSchemaV1.InferOutput<TParams>,
    context: AgentToolContext,
  ) => Promise<unknown>;
}

/**
 * Identity helper that infers a tool's `execute` input type from its
 * `parameters` schema, then returns the type-erased {@link AgentTool} so tools
 * compose into a homogeneous `AgentTool[]`. Prefer this over annotating tools
 * `: AgentTool` directly, which would erase the input type to `unknown`.
 */
export function defineAgentTool<TParams extends StandardSchemaV1>(tool: {
  name: string;
  description: string;
  agents: AgentId[];
  parameters: TParams;
  outputSchema?: StandardSchemaV1;
  execute: (
    input: StandardSchemaV1.InferOutput<TParams>,
    context: AgentToolContext,
  ) => Promise<unknown>;
}): AgentTool {
  return tool as AgentTool;
}

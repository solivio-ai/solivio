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

export interface AgentTool<
  TParams extends StandardSchemaV1 = StandardSchemaV1,
  TOutput extends StandardSchemaV1 = StandardSchemaV1,
> {
  name: string;
  description: string;
  parameters: TParams;
  /** Optional output schema. When omitted, the core does not constrain output. */
  outputSchema?: TOutput;
  execute: (input: StandardSchemaV1.InferOutput<TParams>) => Promise<unknown>;
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
  parameters: TParams;
  outputSchema?: StandardSchemaV1;
  execute: (input: StandardSchemaV1.InferOutput<TParams>) => Promise<unknown>;
}): AgentTool {
  return tool as AgentTool;
}

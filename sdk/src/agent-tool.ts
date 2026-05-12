/**
 * Agent tools are capabilities AI agents can call during a pipeline run.
 * The agent decides whether to invoke them based on intent.
 * Examples: search_catalog, lookup_industry_standard, recall_instance_memory
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";

export interface AgentTool<
  TParams extends StandardSchemaV1 = StandardSchemaV1,
  TOutput extends StandardSchemaV1 = StandardSchemaV1,
> {
  name: string;
  description: string;
  parameters: TParams;
  outputSchema: TOutput;
  execute: (
    input: StandardSchemaV1.InferOutput<TParams>,
  ) => Promise<StandardSchemaV1.InferOutput<TOutput>>;
}

/**
 * Agent tools are capabilities AI agents can call during a pipeline run.
 * The agent decides whether to invoke them based on intent.
 * Examples: search_catalog, lookup_industry_standard, recall_instance_memory
 */

import type { z } from "zod";

export interface AgentTool<
  TParams extends z.ZodTypeAny = z.ZodTypeAny,
  TOutput extends z.ZodTypeAny = z.ZodTypeAny,
> {
  /** Unique name used to identify the tool in agent prompts, e.g. "search_catalog". */
  name: string;
  /** Human-readable description shown to the agent in its system prompt. */
  description: string;
  /** Zod schema that validates and types the tool's input parameters. */
  parameters: TParams;
  /** Zod schema for the tool's return value. */
  outputSchema: TOutput;
  execute: (input: z.infer<TParams>) => Promise<z.infer<TOutput>>;
}

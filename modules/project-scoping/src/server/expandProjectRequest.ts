import "server-only";

import { Agent } from "@voltagent/core";
import { Output } from "ai";
import { z } from "zod";

// Type-side wiring for dependsOn modules (erased at runtime).
import type {} from "@solivio/module-knowledge-base/services.ts";
import { getAi, getLogger, getService } from "@solivio/sdk/runtime";

import type { KnowledgeArticleRef, KnowledgeMatch } from "../lib/knowledgeContext.ts";
import {
  formatKnowledgeContext,
  mergeMatches,
  resolveArticleRefs,
} from "../lib/knowledgeContext.ts";

// Domain knowledge (what a project consists of, defaults, norms) lives in the
// knowledge base, never in these prompts — the module stays industry-agnostic.

const PLAN_INSTRUCTIONS = `
You plan the scope of a customer's project-style request (something to build, equip,
renovate or install) so that internal guidance can be looked up for each part.

Return:
- projectSummary: one sentence naming the project, its size and the requested scope.
- components: the parts/stages of work the project consists of within the requested scope
  (3-12 entries). For each, kbQuery is a short search query, in the request's language,
  that would find internal guidance on selecting products and estimating quantities for it.
  Also include one component for the overall scope checklist and one for default
  assumptions when data is missing.
`.trim();

const COMPOSE_INSTRUCTIONS = `
You turn a project-style customer request into an approximate list of products that a
sales team will price. You receive the request, a scope plan and internal knowledge-base
articles (each block starts with [articleId]).

Rules:
- Ground items in the knowledge base wherever it covers a component: its product types,
  variant-selection rules, defaults, mandatory companion items and quantity norms. Put the
  ids of the articles you relied on in sourceArticleIds.
- List physical products only — no labour, services or work stages.
- Explicit customer choices (material, colour, brand, standard) override defaults.
- When the request lacks data, apply the knowledge base's default assumptions (or common
  standard ones) and state each one in assumptions.
- Include mandatory companion products the knowledge base names (system accessories,
  fixings, consumables) with required=true; optional extras with required=false only when
  clearly useful.
- Leave out anything the knowledge base marks as outside the requested scope and mention
  the exclusion in assumptions.
- sku: copy a SKU only when it appears verbatim in the articles for exactly this product.
  Never invent or alter SKUs; otherwise null.
- query: product-search query — product type plus identifying specs, base (dictionary)
  form, in the request language followed by an English translation ("X / Y"), no quantities.
- phrase: short line (max ~8 words) in the request language describing the item.
- quantity: positive integer estimate in the product's sales unit, derived from the
  knowledge base's quantity norms and the project size, rounded up to whole sales units.
  basis: the calculation only, e.g. "120 m² × 15 pcs/m² = 1800 pcs", no prose. If nothing
  supports an estimate, use 1 and write "to be confirmed" in the request language.
- One entry per distinct product — sum quantities instead of repeating a product.
- missingInfo: up to 6 questions the salesperson should ask to make the estimate precise.
- Write phrase, basis, assumptions and missingInfo in the request's language. Keep every text
  field terse: the list is long and output length drives latency.
- Prefer completeness: a typical project needs 20-60 items.
`.trim();

const planSchema = z.object({
  projectSummary: z.string(),
  components: z
    .array(z.object({ name: z.string(), kbQuery: z.string() }))
    .min(1)
    .max(14),
});

const composedItemSchema = z.object({
  group: z.string().describe("Component/stage the item belongs to"),
  phrase: z.string().describe("Human-readable item line in the request language"),
  query: z.string().describe("Bilingual product-search query, no quantities"),
  sku: z.string().nullable().describe("SKU quoted verbatim from the knowledge base, else null"),
  quantity: z.number().int().positive(),
  unit: z.string().describe("Sales unit, e.g. szt, m², mb, m³, kg, worek, rolka"),
  basis: z.string().describe("How the quantity was estimated"),
  required: z.boolean().describe("Mandatory for the scope (true) or optional extra (false)"),
  sourceArticleIds: z.array(z.string()),
});

const composeSchema = z.object({
  items: z.array(composedItemSchema),
  assumptions: z.array(z.string()),
  missingInfo: z.array(z.string()),
});

export type ProjectItem = Omit<z.infer<typeof composedItemSchema>, "sourceArticleIds">;

export type ProjectExpansion = {
  projectSummary: string;
  items: ProjectItem[];
  assumptions: string[];
  missingInfo: string[];
  kbArticles: KnowledgeArticleRef[];
};

const MATCHES_PER_COMPONENT = 3;
const MATCHES_FOR_REQUEST = 5;
const MAX_ARTICLES = 14;
const MAX_CONTEXT_CHARS = 40_000;

// The knowledge base carries the domain reasoning, so both calls run with low
// reasoning effort; latency is dominated by output length, not by thinking.
const FAST_REASONING = { openai: { reasoningEffort: "low" } } as const;

let planAgentInstance: Agent | undefined;
let composeAgentInstance: Agent | undefined;

function planAgent(): Agent {
  planAgentInstance ??= new Agent({
    name: "project-scoping-plan",
    instructions: PLAN_INSTRUCTIONS,
    // Listing a dozen components is a short, low-stakes output: the cheaper
    // chat-tier model is enough and noticeably faster than offerGeneration.
    model: getAi().modelFor("chat"),
  });
  return planAgentInstance;
}

function composeAgent(): Agent {
  composeAgentInstance ??= new Agent({
    name: "project-scoping-compose",
    instructions: COMPOSE_INSTRUCTIONS,
    model: getAi().modelFor("offerGeneration"),
  });
  return composeAgentInstance;
}

async function retrieveKnowledge(request: string, queries: string[]): Promise<KnowledgeMatch[]> {
  const log = getLogger("project-scoping");
  const kb = getService("knowledge-base");
  const search = (query: string, limit: number) =>
    kb.searchArticles(query, { limit }).catch((error: unknown) => {
      log.warn("knowledge-base search failed", { query, error: String(error) });
      return [];
    });

  const groups = await Promise.all([
    search(request, MATCHES_FOR_REQUEST),
    ...queries.map((q) => search(q, MATCHES_PER_COMPONENT)),
  ]);
  return mergeMatches(groups, MAX_ARTICLES);
}

export async function expandProjectRequest(request: string): Promise<ProjectExpansion> {
  const log = getLogger("project-scoping");
  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;

  const planResult = await planAgent().generateText(request, {
    output: Output.object({ schema: planSchema }),
    providerOptions: FAST_REASONING,
  });
  const plan = planSchema.parse(planResult.output);
  const planMs = elapsed();
  log.info("project-scoping planned components", {
    components: plan.components.length,
    durationMs: planMs,
  });

  const articles = await retrieveKnowledge(
    request,
    plan.components.map((c) => c.kbQuery),
  );
  const retrieveMs = elapsed() - planMs;
  log.info("project-scoping retrieved knowledge", {
    components: plan.components.length,
    articles: articles.length,
    durationMs: retrieveMs,
  });

  const context = formatKnowledgeContext(articles, MAX_CONTEXT_CHARS);
  const prompt = [
    `Customer request:\n${request}`,
    `Scope plan:\n${plan.projectSummary}\n${plan.components.map((c) => `- ${c.name}`).join("\n")}`,
    `Knowledge base articles:\n${context || "(none found — rely on common practice and say so in assumptions)"}`,
  ].join("\n\n");

  const composeResult = await composeAgent().generateText(prompt, {
    output: Output.object({ schema: composeSchema }),
    providerOptions: FAST_REASONING,
  });
  const composed = composeSchema.parse(composeResult.output);

  const kbArticles = resolveArticleRefs(
    composed.items.flatMap((item) => item.sourceArticleIds),
    articles,
  );
  log.info("project-scoping composed items", {
    items: composed.items.length,
    kbArticles: kbArticles.length,
    durationMs: elapsed() - planMs - retrieveMs,
    totalMs: elapsed(),
  });

  return {
    projectSummary: plan.projectSummary,
    items: composed.items.map(({ sourceArticleIds: _, ...item }) => item),
    assumptions: composed.assumptions,
    missingInfo: composed.missingInfo,
    kbArticles,
  };
}

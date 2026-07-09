# Named Agents

Status: reflects the current modular codebase
Last updated: 2026-06-10

Named agents live **in the module that owns their domain** — not in the core. The core
contributes per-role model routing and nothing else. This document is the inventory and
the extension model; the architectural framing is `architecture.md` §6.

## Current inventory

| Agent | Module | File | Model role | Purpose |
|---|---|---|---|---|
| Offer generation | offers | `modules/offers/src/ai/agents/offerGenerationAgent.ts` | `offerGeneration` | Drafts a structured offer from a customer request: extracts items, batches product searches (via the catalog service), maps matches to the offer schema. |
| Offer name | offers | `modules/offers/src/ai/agents/offerNameAgent.ts` | `offerName` | Generates a short offer title from the request. |
| Offer validation | offers | `modules/offers/src/ai/agents/offerValidationAgent.ts` | `offerValidation` | Compares an offer against the original request; returns pass / partial / fail with structured issues. |
| Chat (salesperson copilot) | offer-chat | `modules/offer-chat/src/ai/chatAgent.ts` | `chat` | Human-in-the-loop copilot in the offer review UI. Built from the **merged agent-tool registry** (`getAgentTools()`), so its capabilities come from other modules. |
| Product search | catalog | `modules/catalog/src/server/productSearchAgent.ts` | `productSearch` | Wraps vector search with an LLM-formatted answer behind `POST /api/products/search`. Slated to become a plain `search_catalog` tool. |
| Space description | knowledge-base | `modules/knowledge-base/src/ai/spaceDescriptionAgent.ts` | `offerName` | Generates a short description for a knowledge-base space from its article titles (reuses the cheap short-output role). |

All agents are built on Voltagent over the Vercel AI SDK. VoltOps tracing is opt-in per
deployment via `VOLTAGENT_TRACING=true` + `VOLTAGENT_PUBLIC_KEY`/`VOLTAGENT_SECRET_KEY`.

## Per-role models

Model selection is a deployment concern owned by the core
(`apps/solivio/src/server/runtime/ai/modelConfig.ts`): each role has a default
(quality-critical roles on a top-tier model, cheap roles on small ones) and an env
override (`OPENAI_MODEL_OFFER_GENERATION`, `OPENAI_MODEL_OFFER_VALIDATION`,
`OPENAI_MODEL_OFFER_NAME`, `OPENAI_MODEL_CHAT`, `OPENAI_MODEL_PRODUCT_SEARCH`).

Modules resolve their model through the SDK runtime — never hardcode:

```ts
import { getAi } from "@solivio/sdk/runtime";
const model = getAi().modelFor("offerGeneration");
```

(`getAi()` also exposes `chatModelId()` and `embeddingModelId()` — the catalog module
uses the latter for product embeddings. The catalog's product-search agent currently
reads `OPENAI_MODEL_PRODUCT_SEARCH` directly with its own default rather than going
through `modelFor` — a leftover from its verbatim move into the module.)

## Tools — how modules extend agents

Agent tools are the extension path. A module contributes tools in `src/ai/tools.ts`
(`export const tools: AgentTool[]`, built with `defineAgentTool`); the generator merges
them into one registry; agents consume the registry via `getAgentTools()` and adapt the
framework-agnostic shape to Voltagent at the consumption boundary (see
`toVoltagentTool` in `chatAgent.ts`).

Concretely today: the **offers** module contributes the copilot's offer-editing tools
(`search_products`, `add_product_to_offer`, `update_offer_line_item`,
`remove_offer_line_item`, `propose_products_for_requirements`, `bulk_add_products`) —
they call the `catalog` and `offers` services lazily via `getService()` — and the
**order-history** module contributes `recall_order_history` for both the copilot and
offer-generation agents. The **knowledge-base** module likewise contributes its RAG
retrieval tools (`browse_knowledge_base`, `search_knowledge_base`, `list_articles`,
`get_article`) to the same two agents, so the offer generator can ground decisions in
internal articles. The consuming agents request their scoped tool registry through
`getAgentTools()`; neither module imports another module's implementation.

## Rules for agent code in modules

- **Lazy construction.** Agents must be instantiated inside handlers/memoized
  factories, never at module import time: the SDK runtime (`getAi`, `getService`,
  `getAgentTools`) only exists after instrumentation boot. `offerNameAgent` (nullish
  memoization) and `chatAgent` (promise singleton) show the two patterns.
- **Services, not imports.** Agents reach other domains through `getService()`; their
  tools do the same at execution time.
- **Structured output.** Constrain agent output with schemas (`Output`/zod) before it
  touches state.
- An agent earns a *named* entry only when it needs its own prompt + model role +
  trace identity. Anything else is a tool.

## Target shape (unchanged)

The longer-term reconciliation still stands: extract requirement extraction out of
offer generation into its own pipeline agent; demote the product-search agent to a
`search_catalog` tool; keep the copilot and the utility name agent as-is. New pipeline
agents belong to the module that owns the state they touch.

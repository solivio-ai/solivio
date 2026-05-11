# Named Agents

Status: reflects current PoC state and target post-restructuring
Last updated: 2026-05-07

This document maps the agents that exist in the codebase today onto the named-agent model described in `architecture.md` §6. It is intentionally specific so a contributor reading it can find the actual files in `apps/solivio/src/server/agents/`.

The architecture document describes the *model* (named agents owned by the core, modules extend with tools / always-loaded context / prompt fragments). This document describes the *current set* and how it should evolve.

## Today: what exists in the PoC

| File | Voltagent name | Role |
|---|---|---|
| `chatAgent.ts` | `chat-agent` | Salesperson copilot during offer review. Calls tools to search products and edit the draft offer. Human-in-the-loop, not pipeline-driven. |
| `offerGenerationAgent.ts` | (anonymous) | Currently bundles requirement extraction + product matching + offer drafting in a single flow. |
| `offerNameAgent.ts` | `offer-name-agent` | Generates a short title for an offer from the client request. |
| `offerValidationAgent.ts` | (anonymous) | Compares an offer against the original customer request and returns pass / partial / fail with structured issues. |
| `productSearchAgent.ts` | (function-only) | Wraps a vector search with an LLM-formatted answer. Not a real agent — a tool with extra steps. |

## Reconciliation

### Pipeline agents (run automatically as part of the request → offer flow)

These are the load-bearing agents the architecture commits to. They are owned by the core; modules extend them via tools, always-loaded context, and prompt fragments.

| Named agent | Status | Notes |
|---|---|---|
| `requirement-extraction-agent` | **new** | Currently embedded inside `offerGenerationAgent`. Should be extracted: takes a normalized request, returns a structured requirement set. The split makes requirements observable, validatable, and editable independently of generation. |
| `offer-generation-agent` | **rename + shrink** | Today's `offerGenerationAgent` becomes this, minus the requirement-extraction step (which moves to its own agent). Drafts an offer from requirements + always-loaded context + tool-fetched context. |
| `validation-agent` | **rename** | Today's `offerValidationAgent`. Runs AI-assisted validation alongside the deterministic typed-rule registry. |

### Review-time agent (human-in-the-loop)

| Named agent | Status | Notes |
|---|---|---|
| `chat-agent` | **kept** | Salesperson copilot inside the offer review UI. Distinct from pipeline agents — triggered by the user, not the pipeline. Same extension model (tools, prompt fragments, always-loaded context), but never runs as part of a state transition. |

### Utility agents

Small focused single-prompt agents called by other agents or by the salesperson UI. They have their own prompt, model, and audit entry, but no flow.

| Named agent | Status | Notes |
|---|---|---|
| `offer-name-agent` | **kept** | Generates a short offer name. Could collapse into a sub-task of `offer-generation-agent`, but keeping it separate keeps generation focused and naming cheap to retry/regenerate. |

### Demoted to tools

| Today | Becomes | Notes |
|---|---|---|
| `productSearchAgent.ts` | `search_catalog` tool, exposed by the **catalog-tool** starter-pack module | Vector search wrapped in an LLM answer is not an agent — it is a tool the agent decides to call. |

## Target list

Once the reconciliation lands, the named-agent registry contains:

- Pipeline:
  - `requirement-extraction-agent`
  - `offer-generation-agent`
  - `validation-agent`
- Review:
  - `chat-agent`
- Utility:
  - `offer-name-agent`

This is the v0 set. New agents enter the registry only when (a) they touch canonical state through a transition, or (b) they need their own prompt + model + audit trail. Anything else is a tool.

## What this implies for the PoC

- Extract requirement extraction out of `offerGenerationAgent` into its own agent.
- Rename `offerValidationAgent` → `validation-agent`.
- Keep `chat-agent`, `offer-name-agent` as-is in shape; align names.
- Move `productSearchAgent` behind a `search_catalog` tool in the catalog module, drop it from the agents registry.

The order and acceptance criteria for these moves belong in implementation planning, not here.

# project-scoping module

Headless capability module. It contributes the `expand_project_request` agent tool
to the offer-generation and chat agents. The tool handles PROJECT-style requests:
the customer describes something to build, equip, renovate or install, or names a
scope of work, instead of listing products. It turns such a request into an
approximate item list that the next step of the flow (`search_products`) consumes.

- **Pipeline** (`server/expandProjectRequest.ts`):
  1. **Plan:** an LLM call splits the request into components, each with a
     knowledge-base query.
  2. **Retrieve:** knowledge-base search per component, plus a search on the raw
     request (merged and deduped in `lib/knowledgeContext.ts`).
  3. **Compose:** an LLM call with structured output returns items (phrase, query,
     optional SKU, estimated quantity + unit + basis, required flag), assumptions,
     open questions, and the cited articles. Cited article ids are resolved against
     the retrieved set, never trusted verbatim.
- **Domain-agnostic by design.** What a project consists of, default assumptions,
  quantity norms and mandatory accessories live in the knowledge base, not in these
  prompts. A new industry needs knowledge-base content, not code.
- **Dependencies:** `dependsOn: ["knowledge-base"]`. It reaches the knowledge base
  only through `getService("knowledge-base").searchArticles` (type-only import of
  its `services.ts`).
- **Model:** reuses the `offerGeneration` role via `getAi().modelFor`; it has no
  model role of its own.
- No tables, routes, pages or events.
- After changes: `yarn generate && yarn check && yarn typecheck`.

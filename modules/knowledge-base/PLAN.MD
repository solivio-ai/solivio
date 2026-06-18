# Knowledge Base Module — Implementation Plan

Exploration-first approach: each phase delivers something runnable to look at and react to before the next phase locks in decisions. UI especially is treated as a series of iterations, not a one-shot delivery.

---

## Phase 1 — Data Foundation - DONE

Goal: a working schema, module scaffold, and the canonical JSON format that every future adapter targets.

- Module scaffold (`package.json`, `tsconfig.json`, `src/index.ts`, `src/services.ts`)
- DB schema (`src/data/schema.ts`):
  - `knowledge_base_spaces` — top-level navigation unit; each space has its own dedicated map canvas (name, description, color, icon, source metadata: origin, external_id, synced_at); maps to a Confluence Space / Notion workspace / Google Drive folder when adapter-synced
  - `knowledge_base_articles` — article node (space_id, parent_id, title, body markdown, type: `article|directive|template|...`, position metadata for map layout, source metadata)
  - `knowledge_base_connections` — typed links between articles (from_id, to_id, type: `related|prerequisite|contradicts|...`)
  - `knowledge_base_tags` — flat tags on articles (m2m join)
  - `knowledge_base_embeddings` — embedding vector per article (article_id, model, halfvec column via the custom `halfvec` Drizzle type from `modules/catalog/src/data/halfvec.ts`) — stubbed now, populated in Phase 4
- Migration (`src/data/migrations/0000_init.sql`) via `yarn db:generate knowledge-base`
- Canonical JSON import format definition (TypeScript types + Zod schema in `src/lib/importSchema.ts`): mirrors the DB shape so Confluence/Notion adapters just need to map to this format
- Basic `KnowledgeBaseService` stub in `src/services.ts`: `listCategories`, `listArticles`, `findArticleById`, `upsertFromImport`, `createSpace`
- Events skeleton (`src/events.ts`): `knowledge-base.space.created`, `knowledge-base.article.created`, `knowledge-base.article.updated`, `knowledge-base.import.completed`
- ACL (`src/acl.ts`): `knowledge-base.view`, `knowledge-base.edit`, `knowledge-base.import`

Deliverable: `yarn db:check` passes, module registers, no UI yet.

---

## Phase 2 — Map View (PoC) - DONE

Goal: something on the screen to react to. Raw interactive canvas with the real data — good enough to feel the UX, not production-ready.

**Libraries (decided):**
- `@xyflow/react` v12 — canvas, pan/zoom, node rendering, edge drawing, free drag placement
- `elkjs` — auto-layout engine (layered algorithm); called only when user triggers "Auto-layout"; async so it won't block the UI. Dagre was considered but elkjs handles variable tile sizes and typed cross-link edge routing better — matters once users freely add connections between articles.

**Navigation model** (from concept design — interpreted loosely; sources section deferred to Phase 7 adapters):
- Left sidebar: spaces list only (no sources section yet — external adapters are out of scope for this ticket); clicking a space switches to its dedicated map
- Each space is its own map canvas — not a section within a shared canvas
- `+ New space` available in the sidebar at all times, opens a name/color/icon picker, creates the space and navigates into its (empty) map immediately
- Top bar: Map | List toggle, Auto-layout button, `+ Add document`

- Single page `/knowledge-base` — sidebar + main React Flow canvas area
- Space map canvas (PoC tier):
  - Pan + zoom + free node drag (React Flow built-in)
  - Article tiles: custom RF node component — title, type badge (Article / Directive / Template), body preview, updated timestamp
  - Parent-child hierarchy visible via edge style distinction (vs. typed cross-links)
  - Connection edges: React Flow edges, straight for PoC
  - Click tile → article detail drawer (title + body, read-only)
  - "Auto-layout" button → runs elkjs layered algorithm, updates all node positions, saves to DB
  - Drag node → position saved to DB on drop
- `+ New space` in sidebar → creates empty space, navigates into it immediately
- Seeded with a handful of hardcoded articles across 2 spaces so there's something to compare
- Nav entry + sidebar icon (`src/nav.tsx`)

Exploration questions to answer after this phase:
- Should sub-groups (parent articles with children) get a visually distinct node style, or just a regular tile?
- What connection types warrant visible edge style differences in the PoC vs. Phase 6?
- What information density lands on the tile vs. behind a click?

---

## Phase 3 — List View + Article Editor

Goal: the classic mode is fully usable; inline editing works so users can annotate on the fly.

- List/tree view: space → folder hierarchy, expand/collapse, breadcrumb, search/filter bar
- Article detail page (or panel): full markdown render, metadata sidebar (source, tags, connections)
- Basic editor: title, body (markdown textarea or simple rich text), parent picker, connection manager, tag picker
- Create / edit / delete article with optimistic UI
- Mode toggle persisted in URL (`?view=map|list`)

---

## Phase 4 — JSON Importer + Background Jobs

Goal: real data in, structured the way future adapters will use.

- Importer capability (`src/ai/importers.ts`) — accepts the canonical JSON format from Phase 1; maps to `upsertFromImport`; designed so Confluence/Notion/Drive adapters just need to produce that JSON
- Import job (`src/jobs/import.ts`): validates → upserts spaces/articles/connections/tags → generates embeddings (pgvector via `getAi().embeddingModelId()`) → emits `knowledge-base.import.completed`
- Upload UI: file picker in the list view header, progress/status feedback
- Embedding generation wired into every article save (create/edit) as well
- `yarn db:generate knowledge-base` for embedding column migration

---

## Phase 5 — Agent Tools (RAG)

Goal: agents can discover and retrieve knowledge.

- `src/ai/tools.ts` — contributes to the global agent-tool registry:
  - `search_knowledge_base(query, opts)` — hybrid: embedding similarity + keyword fallback, returns ranked article excerpts
  - `browse_knowledge_base(spaceId?, parentId?)` — structural browse, returns article tree with summaries; lets an agent find where to look before pulling content
  - `get_article(articleId)` — full article body + connections
- Agent context hint wired into the offer-chat agent (via the merged registry) so the chat agent knows the KB exists and when to reach for it
- `docs/agents.md` updated with the new `knowledge_base_search` / `knowledge_base_browse` tools

---

## Phase 6 — Map View Polish

Goal: turn the PoC into something shippable and distinctive.

Informed by what Phase 2 exploration revealed. Likely work (to be confirmed):

- Layout algorithm: elkjs already in place from Phase 2; tune algorithm options (spacing, layering, edge routing style) for the polished result
- Connection rendering: curved bezier edges, color/style by connection type, directional arrows
- Tile design: richer card (body preview, source badge, connection count chips, tag pills, type badge)
- Space color/icon picker + rename inline in sidebar
- Full-text search highlight on map tiles
- Keyboard navigation + accessibility pass
- Performance: virtualize off-screen tiles for large spaces

---

## Phase 7 — Future (not scheduled)

Items deliberately deferred:

- **External adapters** — Confluence, Notion, Google Drive, SharePoint (each as its own module or sub-adapter behind the importer capability interface)
- **Drag-and-drop ingestion** — drop an Excel/Word/PDF; AI extracts structure into articles
- **Agent self-learning** — agent writes "lessons learned" entries back to a special space (the `lessons.md` pattern, but in the KB)
- **Source pinning** — pin specific articles/spaces to a specific agent role so it always loads them as context
- **Collaborative editing** — multi-user presence, comments, inline suggestions

---

## Cross-cutting notes

- All tables prefixed `knowledge_base_*` per repo convention
- Cross-module references from `offers` / `offer-chat` go only through `getService("knowledge-base")` and the agent-tool registry — never direct table access
- Source metadata columns (`origin`, `external_id`, `synced_at`) present from Phase 1 so data imported in Phase 4 is migratable to adapter-synced data later without schema changes
- No external services added to the default demo path until adapters land (Phase 7)

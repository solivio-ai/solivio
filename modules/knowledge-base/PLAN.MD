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
  - `knowledge_base_embeddings` — embedding vector per article (article_id, model, halfvec column via the shared `halfvec` type from `@solivio/sdk/db`) — stubbed now, populated in Phase 4
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

## Phase 3 — List View - DONE

Goal: a classic tree-browsing and editing mode alongside the map.

- Mode toggle persisted in URL (`?view=map|list`); `map` is default
- List/tree view: space → folder/article hierarchy, collapsible rows, indent per depth
- Article detail panel (slide-in or right column): full body, type, updated timestamp
- Create article / directory — reuse `AddNodeDialog` from the map view; trigger from a toolbar `+` button in the list header
- Edit article — TODO: removed for now; needs UX rethink (inline editing? side panel? reuse map dialog differently?)
- Delete article — with `AlertDialog` confirmation; optimistic removal; cascades children in UI (same BFS approach as map)
- Breadcrumb trail when navigating deep into a directory

---

## Phase 4 — Processing Pipeline (Chunking + Embeddings) - DONE

Goal: articles indexed and ready for high-quality RAG retrieval. The pipeline must handle very large sources (50 k+ words) and remain format-agnostic so plain text, CSV, and future formats slot in without touching job code.

### Schema changes

- **`knowledge_base_articles`** — add `format` column: `"markdown" | "plain" | "csv"`, default `"markdown"`; determines which chunking strategy is used
- **`knowledge_base_chunks`** (new table): `id`, `article_id`, `chunk_index` (int), `text`, `heading_path` (nullable — populated by markdown/structured chunkers, null for plain text)
- **`knowledge_base_embeddings`** — repurpose to reference `chunk_id` instead of `article_id` (`article_id` column removed; `chunk_id` FK added)
- Add HNSW index on `knowledge_base_embeddings.embedding` (mirror `catalog_products` pattern)
- `yarn db:generate knowledge-base` for all of the above

### Chunking strategy

Format-agnostic via a **`Chunker` interface** in `src/lib/chunking/`:

```
src/lib/chunking/
  index.ts      — getChunker(format): Chunker factory
  markdown.ts   — MarkdownTextSplitter from @langchain/textsplitters; preserves heading_path
  plainText.ts  — RecursiveCharacterTextSplitter from @langchain/textsplitters
  csv.ts        — row/semantic chunker (TODO: implement when CSV articles land)
```

Chunk size target: ~800 characters / ~150 tokens; overlap: ~100 characters. Fits comfortably within the 8 k context window of `text-embedding-3-large` while keeping chunk count manageable (~125 chunks for a 50 k-word article).

Add `@langchain/textsplitters` as a dependency (standalone, no LLM deps, ~15 kB).

### Job pipeline

```
knowledge-base.article.created / .updated  (persistent subscriber)
  → enqueueJob("knowledge-base.chunkArticle", { articleId })

knowledge-base.chunkArticle  (src/jobs/chunkArticle.ts)
  1. Load article (body + format)
  2. getChunker(format).split(body)  →  chunks[]
  3. DELETE existing chunks for articleId; INSERT new rows
  4. enqueueJob("knowledge-base.embedChunks", { articleId })

knowledge-base.embedChunks  (src/jobs/embedChunks.ts)
  1. Load all chunks for articleId
  2. embedMany(chunk texts, getAi().embeddingModelId())  →  vectors
     (Vercel AI SDK auto-batches; single API call for ~125 chunks)
  3. Upsert embeddings into knowledge_base_embeddings (keyed by chunk_id)
  4. emit("knowledge-base.article.indexed", { articleId })
```

Both jobs: `persistent: true` — queue-backed, retry-safe (retryLimit: 3), visible in the job engine.

- `yarn db:generate knowledge-base` for the new tables
- Emit `knowledge-base.article.indexed` after both jobs complete for a given article

---

## Phase 5 — RAG Tool + Benchmark Suite

Goal: agents can retrieve relevant knowledge; retrieval quality is measurable and improvable.

**Benchmark first.** Before implementing retrieval, build the benchmark suite so every subsequent change can be measured:

- New suite `suites/knowledge-base/` in `apps/solivio/benchmarks/` following the `offer-generation` pattern
- **Fixture corpus**: a realistic multi-space knowledge base (product policies, installation guides, regulatory notes, contradictory/overlapping articles) committed as seed JSON — complex enough to expose ranking failures
- **Cases** with difficulty tiers:
  - `basic` — explicit keyword match; exact article should rank first
  - `realistic` — paraphrased query; synonym/inflection variation; correct article still top-3
  - `hard` — multi-hop: answer requires combining two articles; ambiguous query where the wrong article would be plausible
  - `expert` — cross-space retrieval; query targets an article only identifiable from its context (parent directory, connections), not its own text
- **Scoring**: deterministic — no LLM-as-judge; per query: recall@k (did the right article appear in top-k results?), precision@k, MRR; overall = macro mean across cases; case-set hash guards cross-run comparability
- Target baselines to aim for before shipping: basic ≥ 100%, realistic ≥ 90%, hard ≥ 70%, expert tracked but not gated

**Agent tools** (implemented against a passing benchmark):

- `src/ai/tools.ts`:
  - `search_knowledge_base(query, spaceId?)` — hybrid: chunk-level embedding similarity + keyword fallback; returns ranked article excerpts with source breadcrumb
  - `browse_knowledge_base(spaceId?, parentId?)` — structural browse returning article tree with title/type/description; lets the agent locate where to look before pulling content
  - `get_article(articleId)` — full article body + connections + tags
- Agent context hint wired into `offer-chat` so the agent knows the KB exists and when to reach for it
- `docs/agents.md` updated with the new tools

---

## Phase 6 — JSON Importer

Goal: bulk-load a knowledge base from a structured JSON file; path for Confluence/Notion/Drive adapters.

- Canonical JSON format finalised in `src/lib/importSchema.ts` (Zod schema); mirrors the DB shape — spaces → articles tree with connections and tags
- Importer capability (`src/ai/importers.ts`) — accepts the canonical JSON; maps to `upsertFromImport`; idempotent on `externalId` so re-imports update rather than duplicate
- Import job (`src/jobs/import.ts`): validates → upserts spaces/articles/connections/tags → enqueues chunking + embedding jobs per article → emits `knowledge-base.import.completed`
- Upload UI: file picker in the list-view header (Phase 3); progress/status feedback via job events
- Design for adapter reuse: Confluence/Notion/Drive adapters only need to produce the canonical JSON; the import job and chunking pipeline are shared

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

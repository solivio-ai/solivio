# knowledge-base module

Internal knowledge base with RAG retrieval for the agents. Standalone — no
`dependsOn`; other modules consume it only through the agent-tool registry,
never via `getService`.

Owns its full surface:

- **Data** (`data/schema.ts`): spaces → articles (tree via `parent_id`) →
  chunks → embeddings, plus connections, tags, and import runs. Self-contained
  schema with no foreign keys into the quoting domain (see `docs/erd.md`).
- **RAG**: articles are chunked (`lib/chunking/`) and embedded; `searchArticles`
  (`server/`) does semantic search. Chunking/embedding run **via persistent
  subscribers** (`subscribers/chunkOnArticle*` → `jobs/embedChunks`), not inline —
  creating/updating an article enqueues the work. Embeddings need
  `OPENAI_API_KEY`; without it, search falls back / is unavailable for those rows.
- **Agent tools** (`ai/tools.ts`): `browse_knowledge_base`, `search_knowledge_base`,
  `list_articles`, `get_article` — contributed to the `offer-generation-agent` and
  `chat-agent`. Plus a `space-description-agent` (reuses the `offerName` model role).
- **Importer**: a JSON import capability (`ai/importers.ts`) + the
  `knowledge-base.import` job; `lib/importSchema.ts` accepts nested or flat payloads.
- **UI**: map and list views (`pages/`, `components/`, `nav.tsx`, `slots.tsx`) and an
  admin import page.
- **Events** (`events.ts`): `knowledge-base.{space.created, article.created,
  article.updated, article.deleted, import.completed, article.indexed}`.
- **ACL** (`acl.ts`): `knowledge-base.`-prefixed permissions.

When seeding/ingesting outside the app (benchmarks, scripts) where the job engine
is absent, mirror the job sequence synchronously: `upsertFromImport` → `getChunker`
→ `replaceChunks` → embed → `upsertEmbeddings` (see `benchmarks/src/setup.ts`).

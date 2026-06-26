# RAG Techniques — Knowledge Base

Techniques for improving retrieval quality, ordered by value-to-effort ratio. Check off as implemented.

---

## 1. Hybrid Search (BM25 + Vector) — Low priority

- [ ] Implemented

Combines keyword scoring with vector similarity. They fail in opposite directions — vector search misses exact terms (SKUs, codes, acronyms), BM25 misses semantic meaning (no word overlap between query and relevant chunk). Together they cover both failure modes.

**Merge strategy:** Reciprocal Rank Fusion — each result scores `1 / (rank + 60)` from each list, scores are summed. Simple, parameter-free, hard to beat.

**Implementation path (Postgres built-in, no extensions):**

Add a generated `tsvector` column to `knowledge_base_chunks`:
```sql
ALTER TABLE knowledge_base_chunks
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (to_tsvector('polish', text)) STORED;

CREATE INDEX ON knowledge_base_chunks USING gin(search_vector);
```

Run both queries in parallel in the search service, merge results with RRF before returning.

**Note:** Use `'polish'` dictionary config (not `'english'`) — articles and queries are in Polish. Postgres has a built-in Polish stemmer so "czujnik" and "czujniki" both match.

---

## 2. Parent-Document Retrieval — High priority

- [ ] Implemented

Embed small chunks for retrieval precision, but return the full parent article (or a larger surrounding window) as context to the agent. The chunk that matches the query is rarely the right granularity to answer from — the agent needs surrounding context.

The `heading_path` column already stored on chunks makes the parent lookup trivial. On a match, fetch the full article body (or N chunks before/after the matched chunk) and return that as the context payload.

---

## 3. Sitemap-First Navigation — High priority

- [ ] Implemented

Before doing a vector search, the agent calls `browse_knowledge_base` which returns the full space tree (spaces → directories → article titles, no bodies). The agent uses this to identify the relevant space or subtree, then scopes the vector search with `spaceId`.

This prevents the agent from searching the wrong space and gives it structural orientation — same pattern search engines use (crawl structure, then fetch content).

The agent instructions in `chatAgent.ts` should explicitly tell it to browse first, not treat search as the first move.

**Scalability note:** compact at 500 articles (~10–15k tokens). At 2000+ articles consider returning only the top two levels by default with a depth parameter.

---

## 4. Metadata Filtering — Medium priority

- [ ] Implemented

Filter by `type` (policy / article / directive), `spaceId`, `tags`, or recency before or alongside vector search. Lets the agent express structured intent — "find policies about X" — rather than surfacing all article types equally.

Schema already supports this (`type`, `spaceId`, tags via `knowledge_base_article_tags`). Just needs to be wired into the search query as optional filters.

---

## 5. Re-ranking — Medium priority

- [ ] Implemented

After retrieving top-N vector candidates, pass query+chunk pairs through a cross-encoder re-ranker that scores them jointly rather than independently. Significantly improves precision for ambiguous or multi-hop queries.

Options:
- OpenAI rerank endpoint
- Cohere Rerank API
- A small local cross-encoder model

Adds one API call per search. Best applied after hybrid search is in place — re-ranking on already-good candidates yields the biggest lift.

---

## 6. Query Expansion / HyDE — Medium priority

- [ ] Implemented

HyDE (Hypothetical Document Embedding): instead of embedding the raw query, use the LLM to generate a hypothetical ideal answer first ("what would the KB article about this look like?"), then embed that. Closes the vocabulary gap between short conversational queries and long article chunks.

Zero infrastructure cost — one extra LLM call before the embedding step. Works well when queries are very short or conversational and chunks are long and structured.

---

## 7. Multilingual / Polish-aware Embeddings — Low priority

- [ ] Implemented

`text-embedding-3-large` handles Polish reasonably well but a model fine-tuned on Polish (e.g. `multilingual-e5-large`) may improve recall for domain-specific Polish terminology. Worth evaluating once a benchmark suite exists to measure the delta.

---

## Notes

- Techniques 2–3 (parent-document retrieval + sitemap navigation) should be implemented as the baseline retrieval stack before Phase 5 ships. Hybrid search (1) can follow once the core is working.
- Benchmark suite (Phase 5) is the measurement layer — implement it alongside or just before these to have a way to quantify improvements.
- Re-ranking (5) and HyDE (6) are best evaluated after hybrid search is in place since they compound on top of it.

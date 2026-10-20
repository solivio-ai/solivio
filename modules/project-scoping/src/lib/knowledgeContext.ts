// Pure helpers for turning knowledge-base search hits into LLM context.
// Kept free of runtime/server imports so they are unit-testable.

/** Structural subset of the knowledge-base service's search match. */
export type KnowledgeMatch = {
  articleId: string;
  articleTitle: string;
  articleBody: string;
  spaceId: string;
  spaceName: string;
  similarity: number;
};

export type KnowledgeArticleRef = {
  articleId: string;
  articleTitle: string;
  spaceId: string;
  spaceName: string;
};

/**
 * Merges several result lists into one: one entry per article (best similarity
 * wins), ordered by similarity, capped at `maxArticles`.
 */
export function mergeMatches(groups: KnowledgeMatch[][], maxArticles: number): KnowledgeMatch[] {
  const best = new Map<string, KnowledgeMatch>();
  for (const match of groups.flat()) {
    const current = best.get(match.articleId);
    if (!current || match.similarity > current.similarity) best.set(match.articleId, match);
  }
  return [...best.values()].sort((a, b) => b.similarity - a.similarity).slice(0, maxArticles);
}

/**
 * Renders articles as `[articleId] title (space)` blocks with full bodies,
 * stopping before the character budget is exceeded.
 */
export function formatKnowledgeContext(articles: KnowledgeMatch[], maxChars: number): string {
  const blocks: string[] = [];
  let used = 0;
  for (const article of articles) {
    const block = `[${article.articleId}] ${article.articleTitle} (${article.spaceName})\n${article.articleBody}`;
    if (used + block.length > maxChars) break;
    blocks.push(block);
    used += block.length;
  }
  return blocks.join("\n\n---\n\n");
}

/**
 * Resolves article ids cited by the model to known articles, dropping unknown
 * ids (hallucinated or truncated) and duplicates while keeping citation order.
 */
export function resolveArticleRefs(
  ids: string[],
  articles: KnowledgeMatch[],
): KnowledgeArticleRef[] {
  const byId = new Map(articles.map((a) => [a.articleId, a]));
  const seen = new Set<string>();
  const refs: KnowledgeArticleRef[] = [];
  for (const id of ids) {
    const article = byId.get(id);
    if (!article || seen.has(id)) continue;
    seen.add(id);
    refs.push({
      articleId: article.articleId,
      articleTitle: article.articleTitle,
      spaceId: article.spaceId,
      spaceName: article.spaceName,
    });
  }
  return refs;
}

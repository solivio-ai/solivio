import { describe, expect, it } from "vitest";

import type { KnowledgeMatch } from "./knowledgeContext.ts";
import { formatKnowledgeContext, mergeMatches, resolveArticleRefs } from "./knowledgeContext.ts";

function match(articleId: string, similarity: number, body = "body"): KnowledgeMatch {
  return {
    articleId,
    articleTitle: `Title ${articleId}`,
    articleBody: body,
    spaceId: "space-1",
    spaceName: "Space",
    similarity,
  };
}

describe("mergeMatches", () => {
  it("keeps one entry per article with the best similarity, ordered and capped", () => {
    const merged = mergeMatches(
      [
        [match("a", 0.4), match("b", 0.9)],
        [match("a", 0.7), match("c", 0.5)],
      ],
      2,
    );
    expect(merged.map((m) => [m.articleId, m.similarity])).toEqual([
      ["b", 0.9],
      ["a", 0.7],
    ]);
  });
});

describe("formatKnowledgeContext", () => {
  it("labels blocks with article ids and stops at the character budget", () => {
    const articles = [match("a", 0.9, "x".repeat(50)), match("b", 0.8, "y".repeat(50))];
    const context = formatKnowledgeContext(articles, 80);
    expect(context).toContain("[a] Title a (Space)");
    expect(context).not.toContain("[b]");
  });
});

describe("resolveArticleRefs", () => {
  it("drops unknown and duplicate ids while keeping citation order", () => {
    const refs = resolveArticleRefs(["b", "zzz", "a", "b"], [match("a", 0.5), match("b", 0.6)]);
    expect(refs.map((r) => r.articleId)).toEqual(["b", "a"]);
    expect(refs[0]).toEqual({
      articleId: "b",
      articleTitle: "Title b",
      spaceId: "space-1",
      spaceName: "Space",
    });
  });
});

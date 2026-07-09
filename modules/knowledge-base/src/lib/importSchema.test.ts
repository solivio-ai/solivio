import { describe, expect, test } from "vitest";

import { flattenArticles, flattenPayload, importPayloadSchema } from "./importSchema.ts";

describe("importPayloadSchema", () => {
  test("accepts a minimal valid payload", () => {
    const result = importPayloadSchema.safeParse({
      spaces: [{ name: "Support", articles: [] }],
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty spaces array", () => {
    const result = importPayloadSchema.safeParse({ spaces: [] });
    expect(result.success).toBe(false);
  });

  test("rejects space with empty name", () => {
    const result = importPayloadSchema.safeParse({
      spaces: [{ name: "", articles: [] }],
    });
    expect(result.success).toBe(false);
  });

  test("applies article defaults: body, type, sortOrder, tags, connections", () => {
    const result = importPayloadSchema.safeParse({
      spaces: [{ name: "S", articles: [{ title: "A" }] }],
    });
    expect(result.success).toBe(true);
    const article = result.data!.spaces[0]!.articles[0]!;
    expect(article.body).toBe("");
    expect(article.type).toBe("article");
    expect(article.sortOrder).toBe(0);
    expect(article.tags).toEqual([]);
    expect(article.connections).toEqual([]);
  });

  test("applies default origin", () => {
    const result = importPayloadSchema.safeParse({
      spaces: [{ name: "S", articles: [] }],
    });
    expect(result.data!.origin).toBe("json-import");
  });
});

describe("flattenArticles", () => {
  test("returns flat list unchanged when no children", () => {
    const flat = flattenArticles([
      {
        externalId: "a",
        title: "A",
        body: "",
        type: "article",
        sortOrder: 0,
        tags: [],
        connections: [],
      },
      {
        externalId: "b",
        title: "B",
        body: "",
        type: "article",
        sortOrder: 1,
        tags: [],
        connections: [],
      },
    ]);
    expect(flat).toHaveLength(2);
    expect(flat.map((a) => a.externalId)).toEqual(["a", "b"]);
    expect(flat.every((a) => a.parentExternalId === undefined)).toBe(true);
  });

  test("flattens nested children and wires parentExternalId", () => {
    const flat = flattenArticles([
      {
        externalId: "parent",
        title: "Parent",
        body: "",
        type: "article",
        sortOrder: 0,
        tags: [],
        connections: [],
        children: [
          {
            externalId: "child",
            title: "Child",
            body: "",
            type: "article",
            sortOrder: 0,
            tags: [],
            connections: [],
          },
        ],
      },
    ]);
    expect(flat).toHaveLength(2);
    expect(flat[0]!.externalId).toBe("parent");
    expect(flat[0]!.parentExternalId).toBeUndefined();
    expect(flat[1]!.externalId).toBe("child");
    expect(flat[1]!.parentExternalId).toBe("parent");
  });

  test("flattens deeply nested tree preserving ancestor chain", () => {
    const flat = flattenArticles([
      {
        externalId: "root",
        title: "Root",
        body: "",
        type: "article",
        sortOrder: 0,
        tags: [],
        connections: [],
        children: [
          {
            externalId: "mid",
            title: "Mid",
            body: "",
            type: "article",
            sortOrder: 0,
            tags: [],
            connections: [],
            children: [
              {
                externalId: "leaf",
                title: "Leaf",
                body: "",
                type: "article",
                sortOrder: 0,
                tags: [],
                connections: [],
              },
            ],
          },
        ],
      },
    ]);
    expect(flat).toHaveLength(3);
    expect(flat[2]!.parentExternalId).toBe("mid");
  });

  test("auto-generates externalId from index when missing", () => {
    const flat = flattenArticles([
      { title: "A", body: "", type: "article", sortOrder: 0, tags: [], connections: [] },
      { title: "B", body: "", type: "article", sortOrder: 1, tags: [], connections: [] },
    ]);
    expect(flat[0]!.externalId).toBe("0");
    expect(flat[1]!.externalId).toBe("1");
  });

  test("ignores inline parentExternalId on top-level articles", () => {
    const flat = flattenArticles([
      {
        externalId: "orphan",
        parentExternalId: "ignored",
        title: "Orphan",
        body: "",
        type: "article",
        sortOrder: 0,
        tags: [],
        connections: [],
      },
    ]);
    expect(flat[0]!.parentExternalId).toBeUndefined();
  });

  test("strips children from output articles", () => {
    const flat = flattenArticles([
      {
        externalId: "p",
        title: "P",
        body: "",
        type: "article",
        sortOrder: 0,
        tags: [],
        connections: [],
        children: [
          {
            externalId: "c",
            title: "C",
            body: "",
            type: "article",
            sortOrder: 0,
            tags: [],
            connections: [],
          },
        ],
      },
    ]);
    for (const a of flat) {
      expect(a.children).toBeUndefined();
    }
  });
});

describe("flattenPayload", () => {
  test("flattens each space independently", () => {
    const payload = importPayloadSchema.parse({
      spaces: [
        {
          name: "Space A",
          articles: [
            {
              externalId: "a1",
              title: "A1",
              children: [{ externalId: "a2", title: "A2" }],
            },
          ],
        },
        {
          name: "Space B",
          articles: [{ externalId: "b1", title: "B1" }],
        },
      ],
    });

    const result = flattenPayload(payload);
    expect(result.spaces[0]!.articles).toHaveLength(2);
    expect(result.spaces[1]!.articles).toHaveLength(1);
    expect(result.spaces[0]!.articles[1]!.parentExternalId).toBe("a1");
  });
});

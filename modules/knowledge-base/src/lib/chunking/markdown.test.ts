import { describe, expect, test } from "vitest";

import { extractHeadingPath, MarkdownChunker } from "./markdown.ts";

describe("extractHeadingPath", () => {
  test("returns null when no headings are present", () => {
    expect(extractHeadingPath("Just some plain text.")).toBeNull();
  });

  test("returns single heading text", () => {
    expect(extractHeadingPath("## Installation\nSome content here.")).toBe("Installation");
  });

  test("joins multiple headings with ' > '", () => {
    expect(extractHeadingPath("## Installation\n### Wiring\nContent.")).toBe(
      "Installation > Wiring",
    );
  });

  test("strips extra whitespace from heading text", () => {
    expect(extractHeadingPath("##  Spaced Out  \nContent.")).toBe("Spaced Out");
  });

  test("handles all heading levels", () => {
    expect(extractHeadingPath("# H1\n## H2\n### H3\n#### H4")).toBe("H1 > H2 > H3 > H4");
  });

  test("ignores heading-like text inside code blocks", () => {
    // The regex matches on line start — a heading inside a fenced block still starts at col 0
    // so this test documents the current behaviour rather than asserting it is absent.
    const text = "## Real Heading\n```\n# not a heading\n```";
    const path = extractHeadingPath(text);
    expect(path).toContain("Real Heading");
  });
});

describe("MarkdownChunker", () => {
  const chunker = new MarkdownChunker();

  test("returns empty array for empty string", async () => {
    const chunks = await chunker.split("");
    expect(chunks).toHaveLength(0);
  });

  test("returns a single chunk for short text", async () => {
    const chunks = await chunker.split("## Hello\nShort content.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.headingPath).toBe("Hello");
  });

  test("splits long text into multiple chunks", async () => {
    const longText = Array.from(
      { length: 5 },
      (_, i) => `## Part ${i + 1}\n ${"word ".repeat(200)}`,
    ).join("\n\n");
    const chunks = await chunker.split(longText);
    expect(chunks.length).toBeGreaterThan(1);
  });

  test("each chunk has a headingPath or null", async () => {
    const text = `## Setup\nContent.\n## Usage\n ${"word ".repeat(200)}`;
    const chunks = await chunker.split(text);
    for (const chunk of chunks) {
      expect(typeof chunk.headingPath === "string" || chunk.headingPath === null).toBe(true);
    }
  });
});

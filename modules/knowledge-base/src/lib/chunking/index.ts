import "server-only";

export interface Chunk {
  text: string;
  headingPath: string | null;
}

export interface Chunker {
  split(text: string): Promise<Chunk[]>;
}

export async function getChunker(format: "markdown" | "plain" | "csv"): Promise<Chunker> {
  switch (format) {
    case "markdown": {
      const { MarkdownChunker } = await import("./markdown.ts");
      return new MarkdownChunker();
    }
    case "plain": {
      const { PlainTextChunker } = await import("./plainText.ts");
      return new PlainTextChunker();
    }
    case "csv":
      throw new Error("CSV chunker not yet implemented");
  }
}

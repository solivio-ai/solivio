import { MarkdownTextSplitter } from "@langchain/textsplitters";

import type { Chunk, Chunker } from "./index.ts";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

export class MarkdownChunker implements Chunker {
  private splitter = new MarkdownTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  async split(text: string): Promise<Chunk[]> {
    const pieces = await this.splitter.splitText(text);
    return pieces.map((piece) => ({
      text: piece,
      headingPath: extractHeadingPath(piece),
    }));
  }
}

// Extract the last heading line found in the chunk as a simple breadcrumb.
// e.g. "## Installation\n### Wiring" → "Installation > Wiring"
function extractHeadingPath(text: string): string | null {
  const headings = [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => m[1]!.trim());
  if (headings.length === 0) return null;
  return headings.join(" > ");
}

import "server-only";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import type { Chunk, Chunker } from "./index.ts";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

export class PlainTextChunker implements Chunker {
  private splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  async split(text: string): Promise<Chunk[]> {
    const pieces = await this.splitter.splitText(text);
    return pieces.map((piece) => ({ text: piece, headingPath: null }));
  }
}

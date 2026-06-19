import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";

import { defineJob } from "@solivio/sdk";
import { emitEvent, getAi, getLogger } from "@solivio/sdk/runtime";

import { findChunksByArticle, upsertEmbeddings } from "../server/knowledgeBaseRepository.ts";

export default defineJob({
  name: "knowledge-base.embedChunks",
  retryLimit: 3,
  handler: async ({ articleId }: { articleId: string }) => {
    const log = getLogger("knowledge-base");

    if (!process.env.OPENAI_API_KEY?.trim()) {
      log.warn("embedChunks: OPENAI_API_KEY not set, skipping embeddings", { articleId });
      return;
    }

    const chunks = await findChunksByArticle(articleId);
    if (chunks.length === 0) return;

    const model = getAi().embeddingModelId();
    const { embeddings } = await embedMany({
      model: openai.embedding(model),
      values: chunks.map((c) => c.text),
    });

    await upsertEmbeddings(
      chunks.map((chunk, i) => ({
        chunkId: chunk.id,
        model,
        vector: embeddings[i]!,
      })),
    );

    log.info("embedChunks: embedded", { articleId, chunks: chunks.length });
    await emitEvent("knowledge-base.article.indexed", { articleId });
  },
});

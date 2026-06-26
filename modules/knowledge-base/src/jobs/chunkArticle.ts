import { defineJob } from "@solivio/sdk";
import { enqueueJob, getLogger } from "@solivio/sdk/runtime";

import { getChunker } from "../lib/chunking/index.ts";
import { findArticleById, replaceChunks } from "../server/knowledgeBaseRepository.ts";

export default defineJob({
  name: "knowledge-base.chunkArticle",
  retryLimit: 3,
  handler: async ({ articleId }: { articleId: string }) => {
    const log = getLogger("knowledge-base");

    const article = await findArticleById(articleId);
    if (!article) {
      log.warn("chunkArticle: article not found, skipping", { articleId });
      return;
    }

    if (!article.body.trim()) {
      await replaceChunks(articleId, []);
      return;
    }

    const chunker = await getChunker(article.format);
    const chunks = await chunker.split(article.body);
    await replaceChunks(articleId, chunks);

    log.info("chunkArticle: chunked", { articleId, chunks: chunks.length });
    await enqueueJob("knowledge-base.embedChunks", { articleId });
  },
});

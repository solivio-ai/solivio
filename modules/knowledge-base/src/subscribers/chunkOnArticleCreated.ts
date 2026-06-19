import { defineSubscriber } from "@solivio/sdk";
import { enqueueJob } from "@solivio/sdk/runtime";

export default defineSubscriber({
  id: "knowledge-base.chunkOnArticleCreated",
  event: "knowledge-base.article.created",
  persistent: true,
  handler: async ({ articleId }) => {
    await enqueueJob("knowledge-base.chunkArticle", { articleId });
  },
});

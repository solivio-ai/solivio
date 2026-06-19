import { defineSubscriber } from "@solivio/sdk";
import { enqueueJob } from "@solivio/sdk/runtime";

export default defineSubscriber({
  id: "knowledge-base.chunkOnArticleUpdated",
  event: "knowledge-base.article.updated",
  persistent: true,
  handler: async ({ articleId }) => {
    await enqueueJob("knowledge-base.chunkArticle", { articleId });
  },
});

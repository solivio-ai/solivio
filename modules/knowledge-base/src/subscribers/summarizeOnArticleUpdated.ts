import { defineSubscriber } from "@solivio/sdk";
import { enqueueJob } from "@solivio/sdk/runtime";

export default defineSubscriber({
  id: "knowledge-base.summarizeOnArticleUpdated",
  event: "knowledge-base.article.updated",
  persistent: true,
  handler: async ({ spaceId }) => {
    await enqueueJob("knowledge-base.summarizeSpace", { spaceId });
  },
});

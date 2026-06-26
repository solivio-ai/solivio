import { defineSubscriber } from "@solivio/sdk";
import { enqueueJob } from "@solivio/sdk/runtime";

export default defineSubscriber({
  id: "knowledge-base.summarizeOnArticleCreated",
  event: "knowledge-base.article.created",
  persistent: true,
  handler: async ({ spaceId }) => {
    await enqueueJob("knowledge-base.summarizeSpace", { spaceId });
  },
});

import { defineSubscriber } from "@solivio/sdk";
import { enqueueJob } from "@solivio/sdk/runtime";

export default defineSubscriber({
  id: "knowledge-base.summarizeOnArticleDeleted",
  event: "knowledge-base.article.deleted",
  persistent: true,
  handler: async ({ spaceId }) => {
    await enqueueJob("knowledge-base.summarizeSpace", { spaceId });
  },
});

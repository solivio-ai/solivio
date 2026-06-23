import { defineJob } from "@solivio/sdk";
import { getLogger } from "@solivio/sdk/runtime";

import { generateSpaceDescription } from "../ai/spaceDescriptionAgent.ts";
import {
  findArticlesBySpace,
  findSpaceById,
  updateSpace,
} from "../server/knowledgeBaseRepository.ts";

export default defineJob({
  name: "knowledge-base.summarizeSpace",
  retryLimit: 2,
  handler: async ({ spaceId }: { spaceId: string }) => {
    const log = getLogger("knowledge-base");

    const space = await findSpaceById(spaceId);
    if (!space) {
      log.warn("summarizeSpace: space not found, skipping", { spaceId });
      return;
    }

    const articles = await findArticlesBySpace(spaceId);
    const titles = articles.map((a) => a.title);

    const description = await generateSpaceDescription(space.name, titles);
    if (!description) return;

    await updateSpace(spaceId, { description });
    log.info("summarizeSpace: updated space description", { spaceId, length: description.length });
  },
});

import { defineJob } from "@solivio/sdk";
import { emitEvent, getLogger } from "@solivio/sdk/runtime";

import { importPayloadSchema } from "../lib/importSchema.ts";
import {
  completeImportRun,
  failImportRun,
  upsertFromImport,
} from "../server/knowledgeBaseRepository.ts";

export default defineJob({
  name: "knowledge-base.import",
  retryLimit: 2,
  handler: async ({ payloadJson, runId }: { payloadJson: string; runId: string }) => {
    const log = getLogger("knowledge-base");

    const raw = JSON.parse(payloadJson);
    const parsed = importPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      log.error("knowledge-base.import: invalid payload", { errors: parsed.error.issues.length });
      await failImportRun(runId, "Invalid payload schema");
      return;
    }

    const payload = parsed.data;
    log.info("knowledge-base.import: starting", {
      spaces: payload.spaces.length,
      articles: payload.spaces.reduce((n, s) => n + s.articles.length, 0),
    });

    try {
      const result = await upsertFromImport(payload);
      log.info("knowledge-base.import: done", result);

      await completeImportRun(runId, {
        spacesCount: result.spacesUpserted,
        articlesUpserted: result.articlesUpserted,
        errors: result.errors,
      });

      // Article create/update events trigger chunking via persistent subscribers.
      for (const spaceId of result.spaceIds) {
        await emitEvent("knowledge-base.import.completed", {
          spaceId,
          upserted: result.articlesUpserted,
          errors: result.errors,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      log.error("knowledge-base.import: failed", { message });
      await failImportRun(runId, message);
      throw err;
    }
  },
});

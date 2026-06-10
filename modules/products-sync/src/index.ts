import { z } from "zod";

import { defineModule } from "@solivio/sdk";

export const optionsSchema = z.object({
  /** External JSON endpoint serving an array of product records. */
  sourceUrl: z.string().optional(),
  /** Cron expression for scheduled sync runs (off when unset). */
  cron: z.string().optional(),
});

export type ProductsSyncOptions = z.infer<typeof optionsSchema>;

export default defineModule({
  id: "products-sync",
  title: "Products Sync",
  version: "0.1.0",
  description: "Periodically syncs products from an external source into the catalog.",
  optionsSchema,
  dependsOn: ["catalog"],
});

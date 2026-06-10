import { defineJob } from "@solivio/sdk";
import { getModuleOptions } from "@solivio/sdk/runtime";

import type { ProductsSyncOptions } from "../index.ts";
import { runProductsSync } from "../server/syncService.ts";

export default defineJob({
  name: "products-sync.run",
  // Resolved at boot from deployment options; unset = no schedule.
  schedule: () => getModuleOptions<ProductsSyncOptions>("products-sync").cron,
  retryLimit: 2,
  handler: async () => {
    await runProductsSync();
  },
});

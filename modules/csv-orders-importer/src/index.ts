import { defineModule } from "@solivio/sdk";

import { csvOrderImporter } from "./importer.js";

export default defineModule({
  id: "csv-orders",
  name: "CSV Orders",
  version: "0.1.0",
  register() {
    return {
      importers: [csvOrderImporter],
    };
  },
});

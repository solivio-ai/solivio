import { defineModule } from "@solivio/sdk";

import { csvProductImporter } from "./importer.js";

export default defineModule({
  id: "csv-products",
  name: "CSV Products",
  version: "0.1.0",
  register() {
    return {
      importers: [csvProductImporter],
    };
  },
});

import { defineLegacyModule } from "@solivio/sdk";

import { csvProductImporter } from "./importer.js";

export default defineLegacyModule({
  id: "csv-products",
  name: "CSV Products",
  version: "0.1.0",
  register() {
    return {
      importers: [csvProductImporter],
    };
  },
});

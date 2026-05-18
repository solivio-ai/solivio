import { createModule } from "@solivio/sdk";

import { csvProductImporter } from "./importer.js";

export default createModule({
  id: "csv-products",
  name: "CSV Products",
  version: "0.1.0",
  importers: [csvProductImporter],
});

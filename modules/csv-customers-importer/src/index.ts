import { defineLegacyModule } from "@solivio/sdk";

import { csvCustomerImporter } from "./importer.js";

export default defineLegacyModule({
  id: "csv-customers",
  name: "CSV Customers",
  version: "0.1.0",
  register() {
    return {
      importers: [csvCustomerImporter],
    };
  },
});

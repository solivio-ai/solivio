import type { AnyImporterDefinition } from "@solivio/sdk";

import { csvCustomerImporter } from "../lib/customerImporter.ts";
import { csvOrderImporter } from "../lib/orderImporter.ts";
import { csvProductImporter } from "../lib/productImporter.ts";

export const importers: AnyImporterDefinition[] = [
  csvProductImporter,
  csvCustomerImporter,
  csvOrderImporter,
];

import type { AnyImporterDefinition } from "@solivio/sdk";

import { csvCustomerImporter } from "../lib/customerImporter.ts";
import { csvProductImporter } from "../lib/productImporter.ts";

export const importers: AnyImporterDefinition[] = [csvProductImporter, csvCustomerImporter];

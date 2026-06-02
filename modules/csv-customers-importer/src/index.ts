import type { ModuleUiContributions } from "@solivio/sdk";
import { defineModule } from "@solivio/sdk";

import { csvCustomerImporter } from "./importer.js";

const customerImportUi = {
  pages: [
    {
      id: "import-customers",
      kind: "client-island",
      clientEntry: "ui/import-customers.mjs",
      target: "customer",
      importerName: csvCustomerImporter.name,
      icon: "building",
      order: 30,
      title: {
        default: "Import customers",
        locales: { pl: "Importuj klientów" },
      },
      description: {
        default: "Upload a customer file to make offer creation faster.",
        locales: { pl: "Prześlij plik klientów, aby szybciej tworzyć oferty." },
      },
      props: {
        title: { en: "Customer upload", pl: "Import klientów" },
        description: {
          en: "Pick a CSV file with at least a customer name column. Existing names are reused automatically.",
          pl: "Wybierz plik CSV z co najmniej kolumną nazwy klienta. Istniejące nazwy zostaną użyte automatycznie.",
        },
        doneLabel: { en: "customer", pl: "klient" },
      },
    },
  ],
  navItems: [
    {
      id: "customer-upload",
      section: "admin",
      pageId: "import-customers",
      icon: "building",
      order: 30,
      label: {
        default: "Customer Upload",
        locales: { pl: "Import klientów" },
      },
    },
  ],
} satisfies ModuleUiContributions;

export default defineModule({
  id: "csv-customers",
  name: "CSV Customers",
  version: "0.1.0",
  register() {
    return {
      importers: [csvCustomerImporter],
      ui: customerImportUi,
    };
  },
});

import type { ModuleUiContributions } from "@solivio/sdk";
import { defineModule } from "@solivio/sdk";

import { csvProductImporter } from "./importer.js";

const productImportUi = {
  pages: [
    {
      id: "import-products",
      kind: "client-island",
      clientEntry: "ui/import-products.mjs",
      target: "product",
      importerName: csvProductImporter.name,
      icon: "package",
      order: 20,
      title: {
        default: "Import products",
        locales: { pl: "Importuj produkty" },
      },
      description: {
        default: "Upload a catalog file to import products.",
        locales: { pl: "Prześlij plik katalogu, aby zaimportować produkty." },
      },
      props: {
        title: { en: "Catalog upload", pl: "Import katalogu" },
        description: {
          en: "Pick a file and import it into the product catalog. The importer runs server-side.",
          pl: "Wybierz plik i zaimportuj go do katalogu produktów. Import odbywa się po stronie serwera.",
        },
        doneLabel: { en: "product", pl: "produkt" },
      },
    },
  ],
  navItems: [
    {
      id: "catalog-upload",
      section: "admin",
      pageId: "import-products",
      icon: "package",
      order: 20,
      label: {
        default: "Catalog Upload",
        locales: { pl: "Import katalogu" },
      },
    },
  ],
} satisfies ModuleUiContributions;

export default defineModule({
  id: "csv-products",
  name: "CSV Products",
  version: "0.1.0",
  register() {
    return {
      importers: [csvProductImporter],
      ui: productImportUi,
    };
  },
});

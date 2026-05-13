import { getTranslations } from "next-intl/server";

import { AppPage } from "@/components/AppPage";
import { ProductImport } from "@/features/product-import";
import { getImporter } from "@/server/modules/registry";

export async function generateMetadata() {
  const t = await getTranslations("ProductImport.page");
  return { title: t("title") };
}

export default async function ProductUploadPage() {
  const t = await getTranslations("ProductImport.page");

  const importer = await getImporter();
  console.log("[upload] importer loaded:", importer.name, "| run:", typeof importer.run);

  return (
    <AppPage>
      <header className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <h1 className="text-2xl leading-tight font-semibold text-foreground">{t("title")}</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
        </div>
      </header>
      <ProductImport />
    </AppPage>
  );
}

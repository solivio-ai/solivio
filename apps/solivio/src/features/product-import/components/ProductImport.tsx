"use client";

import { useTranslations } from "next-intl";

import { ModuleImporterUpload } from "@/features/module-import";

type Props = { accept: string[] };

export function ProductImport({ accept }: Props) {
  const t = useTranslations("ProductImport");

  return (
    <ModuleImporterUpload
      accept={accept}
      cardTitle={t("card.title")}
      cardDescription={t("card.description")}
      endpoint="/api/products/import"
      inputId="file-input"
      rowErrorField="sku"
      target="product"
    />
  );
}

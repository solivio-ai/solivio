"use client";

import { useTranslations } from "next-intl";

import { ModuleImporterUpload } from "@/features/module-import";

type Props = { accept: string[] };

export function CustomerImport({ accept }: Props) {
  const t = useTranslations("CustomerImport");

  return (
    <ModuleImporterUpload
      accept={accept}
      cardTitle={t("card.title")}
      cardDescription={t("card.description")}
      endpoint="/api/customers/import"
      inputId="customer-file-input"
      rowErrorField="name"
      target="customer"
    />
  );
}

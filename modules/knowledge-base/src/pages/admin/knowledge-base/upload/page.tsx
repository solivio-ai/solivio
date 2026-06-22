import { getTranslations } from "next-intl/server";

import { getImporter } from "@solivio/sdk/runtime";
import { AppPage } from "@solivio/ui/components/app-page.tsx";

import { KnowledgeBaseImport } from "../../../../components/KnowledgeBaseImport.tsx";
import { listImportRuns } from "../../../../server/knowledgeBaseRepository.ts";

export async function generateMetadata() {
  const t = await getTranslations("knowledge-base.import.page");
  return { title: t("title") };
}

export default async function KnowledgeBaseUploadPage() {
  const t = await getTranslations("knowledge-base.import.page");
  const [importer, initialRuns] = await Promise.all([
    getImporter("knowledge-base"),
    listImportRuns(20),
  ]);

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
      <KnowledgeBaseImport accept={importer.accept} initialRuns={initialRuns} />
    </AppPage>
  );
}

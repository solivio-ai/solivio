import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";

import { AppPage } from "@/components/AppPage";
import { ModuleClientIsland } from "@/features/module-ui";
import {
  getModuleImporter,
  getModuleUiPage,
  resolveLocalizedText,
} from "@/server/modules/registry";

export const dynamic = "force-dynamic";

type ModuleUiPageProps = {
  params: Promise<{
    moduleId: string;
    pageId: string;
  }>;
};

export async function generateMetadata({ params }: ModuleUiPageProps) {
  const [{ moduleId, pageId }, locale] = await Promise.all([params, getLocale()]);
  const page = await getModuleUiPage(moduleId, pageId);

  return { title: page ? resolveLocalizedText(page.title, locale) : "Module page" };
}

export default async function ModuleUiPage({ params }: ModuleUiPageProps) {
  const [{ moduleId, pageId }, locale] = await Promise.all([params, getLocale()]);
  const page = await getModuleUiPage(moduleId, pageId);
  if (!page) notFound();

  switch (page.kind) {
    case "client-island": {
      const importer =
        page.importerName && page.target
          ? await getModuleImporter(page.moduleId, page.importerName, page.target)
          : null;
      const title = resolveLocalizedText(page.title, locale);
      const description = page.description ? resolveLocalizedText(page.description, locale) : null;

      return (
        <AppPage>
          <header className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-2">
              <h1 className="text-2xl leading-tight font-semibold text-foreground">{title}</h1>
              {description ? (
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </header>
          <ModuleClientIsland
            assetUrl={moduleUiAssetEndpoint(page.moduleId, page.id, page.assetVersion)}
            importer={
              importer
                ? {
                    accept: importer.accept,
                    endpoint: moduleImportEndpoint(page.moduleId, page.id),
                    target: importer.target,
                  }
                : undefined
            }
            locale={locale}
            pageId={page.id}
            pluginProps={page.props ?? {}}
          />
        </AppPage>
      );
    }
  }
}

function moduleImportEndpoint(moduleId: string, pageId: string): string {
  return `/api/admin/modules/${encodeURIComponent(moduleId)}/${encodeURIComponent(pageId)}/import`;
}

function moduleUiAssetEndpoint(moduleId: string, pageId: string, assetVersion: string): string {
  return `/api/admin/modules/${encodeURIComponent(moduleId)}/${encodeURIComponent(pageId)}/ui?v=${encodeURIComponent(assetVersion)}`;
}

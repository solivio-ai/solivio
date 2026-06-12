import { getTranslations } from "next-intl/server";

import { AppPage } from "@solivio/ui/components/app-page.tsx";
import { Badge } from "@solivio/ui/components/badge.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@solivio/ui/components/table.tsx";

import { RunSyncButton } from "../../../components/RunSyncButton.tsx";
import { listSyncRuns } from "../../../server/syncService.ts";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("products-sync.page");
  return { title: t("title") };
}

const statusVariant = {
  succeeded: "default",
  failed: "destructive",
  running: "secondary",
} as const;

export default async function ProductsSyncPage() {
  const t = await getTranslations("products-sync.page");
  const runs = await listSyncRuns();

  return (
    <AppPage>
      <header className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <h1 className="font-semibold text-2xl text-foreground leading-tight">{t("title")}</h1>
          <p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
            {t("description")}
          </p>
        </div>
        <RunSyncButton />
      </header>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columns.startedAt")}</TableHead>
            <TableHead>{t("columns.status")}</TableHead>
            <TableHead>{t("columns.imported")}</TableHead>
            <TableHead>{t("columns.source")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                {t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell>{run.startedAt.toISOString()}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[run.status]}>{t(`status.${run.status}`)}</Badge>
                </TableCell>
                <TableCell>{run.imported}</TableCell>
                <TableCell className="max-w-md truncate font-mono text-xs">{run.source}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </AppPage>
  );
}

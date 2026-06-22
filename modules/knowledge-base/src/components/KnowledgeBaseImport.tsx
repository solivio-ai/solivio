"use client";

import { AlertTriangle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChangeEvent, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@solivio/ui/components/badge.tsx";
import { Button } from "@solivio/ui/components/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@solivio/ui/components/card.tsx";
import { Label } from "@solivio/ui/components/label.tsx";

import type { ImportRunRow } from "../server/knowledgeBaseRepository.ts";

type RowError = { index?: number; message: string };

type UploadStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "queued"; spaces: number }
  | { kind: "error"; message: string; errors: RowError[] };

type Props = { accept: string[]; initialRuns: ImportRunRow[] };

const POLL_INTERVAL_MS = 3000;

export function KnowledgeBaseImport({ accept, initialRuns }: Props) {
  const t = useTranslations("knowledge-base.import");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>({ kind: "idle" });
  const [runs, setRuns] = useState<ImportRunRow[]>(initialRuns);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasRunning = runs.some((r) => r.status === "running");

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge-base/import");
      if (!res.ok) return;
      const data = await res.json();
      setRuns(data.runs ?? []);
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    if (hasRunning) {
      pollRef.current = setInterval(fetchRuns, POLL_INTERVAL_MS);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [hasRunning, fetchRuns]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setRawContent(null);
    setStatus({ kind: "idle" });

    const reader = new FileReader();
    reader.onload = () => setRawContent(String(reader.result ?? ""));
    reader.onerror = () => setStatus({ kind: "error", message: t("card.readError"), errors: [] });
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!rawContent) return;
    setStatus({ kind: "saving" });

    try {
      const response = await fetch("/api/knowledge-base/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: rawContent }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus({
          kind: "error",
          message: payload?.error ?? `Request failed (${response.status})`,
          errors: payload?.errors ?? [],
        });
        return;
      }
      setStatus({ kind: "queued", spaces: payload.spaces ?? 0 });
      await fetchRuns();
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : t("card.importError"),
        errors: [],
      });
    }
  }

  const isSaving = status.kind === "saving";

  return (
    <section className="grid gap-4">
      <Card size="sm">
        <CardHeader className="flex flex-row items-center gap-2 pb-1">
          <Upload size={18} aria-hidden="true" className="text-primary" />
          <CardTitle className="text-base">{t("card.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {t("card.description")}
          </p>

          <div className="grid gap-2">
            <Label
              htmlFor="kb-file-input"
              className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background/60 px-4 py-4 text-center transition-colors hover:bg-muted/40"
            >
              <Upload size={24} aria-hidden="true" className="text-primary" />
              <span className="text-base font-semibold">{fileName ?? t("card.chooseFile")}</span>
              <span className="text-sm text-muted-foreground">
                {fileName ? t("card.pickAnother") : t("card.dropOne")}
              </span>
            </Label>
            <input
              id="kb-file-input"
              type="file"
              accept={accept.join(",")}
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>

          {rawContent ? (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleImport}
                disabled={isSaving}
                className="w-fit"
              >
                <Upload size={16} aria-hidden="true" />
                {isSaving ? t("card.importAction.queuing") : t("card.importAction.import")}
              </Button>

              {status.kind === "queued" ? (
                <StatusNotice tone="success" icon={<CheckCircle2 size={16} aria-hidden="true" />}>
                  {t("card.importDone", { spaces: status.spaces })}
                </StatusNotice>
              ) : null}

              {status.kind === "error" ? (
                <div className="flex flex-col gap-1">
                  <StatusNotice tone="error" icon={<AlertTriangle size={16} aria-hidden="true" />}>
                    {status.message}
                  </StatusNotice>
                  {status.errors.map((e, i) => (
                    <StatusNotice
                      key={i}
                      tone="error"
                      icon={<AlertTriangle size={16} aria-hidden="true" />}
                    >
                      {e.message}
                    </StatusNotice>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {runs.length > 0 ? (
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-base">{t("runs.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">{t("runs.colStatus")}</th>
                  <th className="pb-2 pr-4 font-medium">{t("runs.colSpaces")}</th>
                  <th className="pb-2 pr-4 font-medium">{t("runs.colArticles")}</th>
                  <th className="pb-2 pr-4 font-medium">{t("runs.colErrors")}</th>
                  <th className="pb-2 font-medium">{t("runs.colStarted")}</th>
                </tr>
              </thead>
              <tbody>
                {[...runs].reverse().map((run) => (
                  <tr key={run.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-4">
                      <RunStatusBadge status={run.status} t={t} />
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{run.spacesCount}</td>
                    <td className="py-2 pr-4 tabular-nums">{run.articlesUpserted}</td>
                    <td className="py-2 pr-4 tabular-nums text-destructive">
                      {run.errors > 0 ? run.errors : "—"}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {new Date(run.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function RunStatusBadge({
  status,
  t,
}: {
  status: ImportRunRow["status"];
  t: ReturnType<typeof useTranslations<"knowledge-base.import">>;
}) {
  if (status === "running") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 size={11} className="animate-spin" />
        {t("runs.running")}
      </Badge>
    );
  }
  if (status === "completed") {
    return (
      <Badge variant="secondary" className="border-chart-4/50 bg-chart-4/15 text-foreground">
        {t("runs.completed")}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="bg-destructive/15 text-destructive">
      {t("runs.failed")}
    </Badge>
  );
}

function StatusNotice({
  children,
  icon,
  tone,
}: {
  children: ReactNode;
  icon: ReactNode;
  tone: "error" | "success";
}) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${
        tone === "success"
          ? "border-chart-4/60 bg-chart-4/15 text-foreground"
          : "border-destructive/50 bg-destructive/10 text-destructive"
      }`}
    >
      {icon}
      {children}
    </span>
  );
}

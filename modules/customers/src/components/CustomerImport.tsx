"use client";

import { AlertTriangle, CheckCircle2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChangeEvent, ReactNode } from "react";
import { useState } from "react";

import { Button } from "@solivio/ui/components/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@solivio/ui/components/card.tsx";
import { Label } from "@solivio/ui/components/label.tsx";

type RowError = { index?: number; name?: string; message: string };

type ImportStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "done"; count: number; errors: RowError[] }
  | { kind: "error"; message: string; errors: RowError[] };

type Props = { accept: string[] };

export function CustomerImport({ accept }: Props) {
  const t = useTranslations("CustomerImport");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [status, setStatus] = useState<ImportStatus>({ kind: "idle" });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setRawContent(null);
    setStatus({ kind: "idle" });

    const reader = new FileReader();
    reader.onload = () => {
      setRawContent(String(reader.result ?? ""));
    };
    reader.onerror = () => setStatus({ kind: "error", message: t("card.readError"), errors: [] });
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!rawContent) return;
    setStatus({ kind: "saving" });

    try {
      const response = await fetch("/api/customers/import", {
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
      setStatus({ kind: "done", count: payload.count, errors: payload.errors ?? [] });
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
    <section className="grid gap-3">
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
              htmlFor="customer-file-input"
              className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background/60 px-4 py-4 text-center transition-colors hover:bg-muted/40"
            >
              <Upload size={24} aria-hidden="true" className="text-primary" />
              <span className="text-base font-semibold">{fileName ?? t("card.chooseFile")}</span>
              <span className="text-sm text-muted-foreground">
                {fileName ? t("card.pickAnother") : t("card.dropOne")}
              </span>
            </Label>
            <input
              id="customer-file-input"
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
                {isSaving ? t("card.importAction.saving") : t("card.importAction.import")}
              </Button>

              {status.kind === "done" ? (
                <>
                  <StatusNotice tone="success" icon={<CheckCircle2 size={16} aria-hidden="true" />}>
                    {t("card.importDone", { count: status.count })}
                  </StatusNotice>
                  {status.errors.length > 0 ? (
                    <StatusNotice
                      tone="error"
                      icon={<AlertTriangle size={16} aria-hidden="true" />}
                    >
                      {t("card.importRowErrors", { count: status.errors.length })}
                    </StatusNotice>
                  ) : null}
                </>
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
                      {e.name ? `[${e.name}] ` : ""}
                      {e.message}
                    </StatusNotice>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
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

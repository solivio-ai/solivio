"use client";

import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  RotateCcw,
  Upload
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductImportRow } from "@solivio/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  extractProductRows,
  getMissingColumns,
  parseCsv,
  resolveColumnMap,
  type CsvParseResult
} from "../lib/parseProductCsv";

type EmbeddingModel = {
  id: string;
  label: string;
  dimensions: number;
};

type ImportStatus =
  | { kind: "idle" }
  | { kind: "saving"; processed: number; total: number }
  | { kind: "done"; count: number }
  | { kind: "error"; message: string; processed: number; total: number };

/** Rows per POST. Stays well under the server cap and keeps each request short enough to avoid
 * proxy timeouts while still amortizing the OpenAI round-trip across many rows. */
const CHUNK_SIZE = 500;

export function ProductImport() {
  const t = useTranslations("ProductImport");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [models, setModels] = useState<EmbeddingModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [status, setStatus] = useState<ImportStatus>({ kind: "idle" });

  useEffect(() => {
    fetch("/api/embedding-models")
      .then((res) => res.json())
      .then((data: { models: EmbeddingModel[] }) => {
        const list = data.models ?? [];
        setModels(list);
        if (list.length > 0) setSelectedModel(list[0].id);
      })
      .catch(() => {});
  }, []);

  const columnMap = useMemo(
    () => (parseResult ? resolveColumnMap(parseResult.headers) : {}),
    [parseResult]
  );

  const productRows: ProductImportRow[] = useMemo(
    () => (parseResult ? extractProductRows(parseResult.rows, columnMap) : []),
    [parseResult, columnMap]
  );

  const missingColumns = useMemo(() => getMissingColumns(columnMap), [columnMap]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    setParseResult(null);
    setStatus({ kind: "idle" });

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parseCsv(String(reader.result ?? ""));
        if (result.headers.length === 0) {
          setParseError(t("uploadCard.emptyError"));
          return;
        }
        setParseResult(result);
      } catch {
        setParseError(t("uploadCard.parseError"));
      }
    };
    reader.onerror = () => setParseError(t("uploadCard.readError"));
    reader.readAsText(file);
  }

  function handleReset() {
    setFileName(null);
    setParseResult(null);
    setParseError(null);
    setStatus({ kind: "idle" });
  }

  async function handleImport() {
    if (productRows.length === 0 || !selectedModel) return;
    const total = productRows.length;
    setStatus({ kind: "saving", processed: 0, total });

    let processed = 0;
    for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
      const chunk = productRows.slice(offset, offset + CHUNK_SIZE);

      try {
        const response = await fetch("/api/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: chunk, model: selectedModel })
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? `Request failed (${response.status})`);
        }
      } catch (err) {
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : t("previewCard.importError"),
          processed,
          total
        });
        return;
      }

      processed += chunk.length;
      setStatus({ kind: "saving", processed, total });
    }

    setStatus({ kind: "done", count: processed });
  }

  return (
    <section className="grid gap-3">
      <Card size="sm">
        <CardHeader className="flex flex-row items-center gap-2 pb-1">
          <Upload size={18} aria-hidden="true" className="text-primary" />
          <CardTitle className="text-base">{t("uploadCard.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {t("uploadCard.description")}
          </p>
          <div className="grid gap-2">
            <Label
              htmlFor="csv-input"
              className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background/60 px-4 py-4 text-center transition-colors hover:bg-muted/40"
            >
              <FileSpreadsheet size={24} aria-hidden="true" className="text-primary" />
              <span className="text-base font-semibold">{fileName ?? t("uploadCard.chooseFile")}</span>
              <span className="text-sm text-muted-foreground">
                {fileName ? t("uploadCard.pickAnother") : t("uploadCard.dropOne")}
              </span>
            </Label>
            <input
              id="csv-input"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>
          {parseError ? (
            <StatusNotice tone="error" icon={<AlertTriangle size={16} aria-hidden="true" />}>
              {parseError}
            </StatusNotice>
          ) : null}
        </CardContent>
      </Card>

      {parseResult && parseResult.rows.length > 0 ? (
        <Card size="sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Database size={18} aria-hidden="true" className="text-primary" />
              <CardTitle className="text-base">{t("previewCard.title")}</CardTitle>
              <Badge variant="outline">
                {t("previewCard.rowCount", { count: parseResult.rows.length })}
              </Badge>
            </div>
            <Button variant="ghost" type="button" onClick={handleReset}>
              <RotateCcw size={16} aria-hidden="true" />
              {t("previewCard.clear")}
            </Button>
          </CardHeader>

          <CardContent className="grid gap-3">
            {missingColumns.length > 0 ? (
              <StatusNotice tone="error" icon={<AlertTriangle size={16} aria-hidden="true" />}>
                {t("previewCard.missingColumns", { count: missingColumns.length, columns: missingColumns.join(", ") })}
              </StatusNotice>
            ) : (
              <>
              <div className="flex flex-col gap-2 rounded-lg border bg-background/60 p-2.5 sm:flex-row sm:items-center">
                {models.length > 0 ? (
                  <Select
                    value={selectedModel}
                    onValueChange={(value) => {
                      setSelectedModel(value);
                      setStatus({ kind: "idle" });
                    }}
                    disabled={status.kind === "saving"}
                  >
                    <SelectTrigger className="w-full sm:w-[280px]" aria-label={t("previewCard.modelLabel")}>
                      <SelectValue placeholder={t("previewCard.modelPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline">{t("previewCard.modelsUnavailable")}</Badge>
                )}

                <Button
                  type="button"
                  size="sm"
                  onClick={handleImport}
                  disabled={status.kind === "saving" || productRows.length === 0 || !selectedModel}
                >
                  <Upload size={16} aria-hidden="true" />
                  {status.kind === "saving"
                    ? t("previewCard.importAction.embeddingProgress", {
                        processed: status.processed,
                        total: status.total
                      })
                    : t("previewCard.importAction.saveCount", { count: productRows.length })}
                </Button>

                {status.kind === "done" ? (
                  <StatusNotice tone="success" icon={<CheckCircle2 size={16} aria-hidden="true" />}>
                    {t("previewCard.importDone", { count: status.count })}
                  </StatusNotice>
                ) : null}
                {status.kind === "error" ? (
                  <StatusNotice tone="error" icon={<AlertTriangle size={16} aria-hidden="true" />}>
                    {status.processed > 0
                      ? t("previewCard.importPartialError", {
                          processed: status.processed,
                          total: status.total,
                          message: status.message
                        })
                      : status.message}
                  </StatusNotice>
                ) : null}
              </div>

              {status.kind === "saving" ? (
                <div className="grid gap-1.5">
                  <Progress
                    value={status.total > 0 ? (status.processed / status.total) * 100 : 0}
                    aria-label={t("previewCard.progressLabel")}
                  />
                  <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
                    {t("previewCard.progressText", {
                      processed: status.processed,
                      total: status.total
                    })}
                  </p>
                </div>
              ) : null}
              </>
            )}

            <div className="overflow-hidden rounded-lg border bg-background/60">
              <div className="max-h-[420px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {parseResult.headers.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.rows.slice(0, 50).map((row, i) => (
                      <TableRow key={i}>
                        {parseResult.headers.map((header) => (
                          <TableCell key={header} className="max-w-[320px] whitespace-normal text-muted-foreground">
                            {row[header]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {parseResult.rows.length > 50 ? (
              <p className="text-sm text-muted-foreground">
                {t("previewCard.showingFirst", { count: parseResult.rows.length })}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

function StatusNotice({
  children,
  icon,
  tone
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

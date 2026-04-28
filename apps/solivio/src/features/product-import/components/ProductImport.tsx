"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { ProductImportRow } from "@solivio/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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

type EmbeddingModel = { id: string; label: string; dimensions: number };

type ImportStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "done"; count: number }
  | { kind: "error"; message: string };

export function ProductImport() {
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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    setParseResult(null);
    setStatus({ kind: "idle" });

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = parseCsv(String(reader.result ?? ""));
        if (result.headers.length === 0) { setParseError("The CSV file appears to be empty."); return; }
        setParseResult(result);
      } catch { setParseError("Failed to parse CSV."); }
    };
    reader.onerror = () => setParseError("Failed to read the file.");
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
    setStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: productRows, model: selectedModel })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? `Request failed (${res.status})`);
      setStatus({ kind: "done", count: payload.count ?? productRows.length });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Import failed." });
    }
  }

  return (
    <div className="grid gap-6">
      {/* File picker */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV file</CardTitle>
          <p className="text-sm text-muted-foreground">
            Required columns: <strong>sku</strong>, <strong>name</strong>,{" "}
            <strong>description</strong>, <strong>manufacturer</strong>. Comma, semicolon,
            or tab separators are supported.
          </p>
        </CardHeader>
        <CardContent>
          <Label
            htmlFor="csv-input"
            className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-muted/20 px-5 py-6 text-center transition-colors hover:bg-muted/40"
          >
            <span className="text-base font-semibold">
              {fileName ?? "Choose a CSV file"}
            </span>
            <span className="text-sm text-muted-foreground">
              {fileName ? "Click to pick another file" : "or drop one onto this field"}
            </span>
          </Label>
          <input
            id="csv-input"
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={handleFileChange}
          />
          {parseError ? (
            <p className="mt-3 text-sm font-medium text-destructive">{parseError}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Preview + import */}
      {parseResult && parseResult.rows.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-base">Preview</CardTitle>
              <Badge variant="secondary">
                {parseResult.rows.length} row{parseResult.rows.length === 1 ? "" : "s"}
              </Badge>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={handleReset}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {missingColumns.length > 0 ? (
              <p className="text-sm font-medium text-destructive">
                Missing required column{missingColumns.length === 1 ? "" : "s"}:{" "}
                {missingColumns.join(", ")}.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {models.length > 0 ? (
                  <Select
                    value={selectedModel}
                    onValueChange={(v) => { setSelectedModel(v); setStatus({ kind: "idle" }); }}
                    disabled={status.kind === "saving"}
                  >
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select embedding model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}

                <Button
                  onClick={handleImport}
                  disabled={status.kind === "saving" || productRows.length === 0 || !selectedModel}
                >
                  {status.kind === "saving"
                    ? "Embedding…"
                    : `Embed and save ${productRows.length} product${productRows.length === 1 ? "" : "s"}`}
                </Button>

                {status.kind === "done" ? (
                  <span className="text-sm font-semibold text-emerald-400">
                    Saved {status.count} product{status.count === 1 ? "" : "s"}.
                  </span>
                ) : null}
                {status.kind === "error" ? (
                  <span className="text-sm font-medium text-destructive">{status.message}</span>
                ) : null}
              </div>
            )}

            <div className="rounded-lg border">
              <div className="max-h-[480px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {parseResult.headers.map((h) => (
                        <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.rows.slice(0, 50).map((row, i) => (
                      <TableRow key={i}>
                        {parseResult.headers.map((h) => (
                          <TableCell key={h} className="whitespace-nowrap">{row[h]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parseResult.rows.length > 50 ? (
                <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                  Showing first 50 of {parseResult.rows.length} rows.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

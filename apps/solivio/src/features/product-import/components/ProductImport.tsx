"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import type { ProductImportRow } from "@solivio/domain";
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
        const text = String(reader.result ?? "");
        const result = parseCsv(text);
        if (result.headers.length === 0) {
          setParseError("The CSV file appears to be empty.");
          return;
        }
        setParseResult(result);
      } catch {
        setParseError("Failed to parse CSV.");
      }
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
      const response = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: productRows, model: selectedModel })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? `Request failed (${response.status})`);
      }
      setStatus({ kind: "done", count: payload.count ?? productRows.length });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Import failed."
      });
    }
  }

  return (
    <section className="upload-panel">
      <p className="upload-hint">
        Pick a .csv file with columns: <strong>sku</strong>, <strong>name</strong>,{" "}
        <strong>description</strong>, <strong>manufacturer</strong>. Comma, semicolon, or
        tab separators are supported.
      </p>

      <label className="upload-dropzone">
        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
        <span className="upload-dropzone-title">
          {fileName ?? "Choose a CSV file"}
        </span>
        <span className="upload-dropzone-sub">
          {fileName ? "Click to pick another file" : "or drop one onto this field"}
        </span>
      </label>

      {parseError ? <p className="upload-error">{parseError}</p> : null}

      {parseResult && parseResult.rows.length > 0 ? (
        <div className="upload-preview">
          <div className="upload-preview-head">
            <h2>Preview</h2>
            <span>
              {parseResult.rows.length} row{parseResult.rows.length === 1 ? "" : "s"}
            </span>
            <button className="icon-button" type="button" onClick={handleReset}>
              Clear
            </button>
          </div>

          {missingColumns.length > 0 ? (
            <p className="upload-error">
              Missing required column{missingColumns.length === 1 ? "" : "s"}:{" "}
              {missingColumns.join(", ")}.
            </p>
          ) : (
            <div className="upload-actions">
              {models.length > 0 ? (
                <select
                  className="upload-model-select"
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    setStatus({ kind: "idle" });
                  }}
                  disabled={status.kind === "saving"}
                >
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              ) : null}

              <button
                type="button"
                onClick={handleImport}
                disabled={
                  status.kind === "saving" || productRows.length === 0 || !selectedModel
                }
              >
                {status.kind === "saving"
                  ? "Embedding…"
                  : `Embed and save ${productRows.length} product${productRows.length === 1 ? "" : "s"}`}
              </button>

              {status.kind === "done" ? (
                <span className="upload-status-ok">
                  Saved {status.count} product{status.count === 1 ? "" : "s"}.
                </span>
              ) : null}
              {status.kind === "error" ? (
                <span className="upload-status-err">{status.message}</span>
              ) : null}
            </div>
          )}

          <div className="upload-table-wrap">
            <table className="upload-table">
              <thead>
                <tr>
                  {parseResult.headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parseResult.rows.slice(0, 50).map((row, i) => (
                  <tr key={i}>
                    {parseResult.headers.map((header) => (
                      <td key={header}>{row[header]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parseResult.rows.length > 50 ? (
            <p className="upload-hint">
              Showing the first 50 of {parseResult.rows.length} rows.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

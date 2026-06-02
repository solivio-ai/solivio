import type { ChangeEvent, ReactNode } from "react";
import { useState } from "react";
import { createRoot } from "react-dom/client";

import type { ModuleUiMountContext } from "@solivio/sdk";

export const solivioUiVersion = 1;

type LocaleText = Record<string, string>;

type RowError = {
  index?: number;
  message: string;
  name?: string;
};

type ImportStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "done"; count: number; errors: RowError[] }
  | { kind: "error"; message: string; errors: RowError[] };

type ImportUploadProps = {
  description?: LocaleText;
  title?: LocaleText;
};

const copy = {
  chooseFile: { en: "Choose a file", pl: "Wybierz plik" },
  pickAnother: { en: "Click to pick another file", pl: "Kliknij, aby wybrać inny plik" },
  dropOne: { en: "or drop one onto this field", pl: "lub przeciągnij plik tutaj" },
  importAction: { en: "Import", pl: "Importuj" },
  importing: { en: "Importing...", pl: "Importowanie..." },
  readError: { en: "Failed to read the file.", pl: "Nie udało się odczytać pliku." },
  importError: { en: "Import failed.", pl: "Import nie powiódł się." },
  rowErrors: {
    en: "{count} row(s) could not be imported.",
    pl: "Nie udało się zaimportować {count} wierszy.",
  },
  saved: { en: "Saved {count} customer(s).", pl: "Zapisano {count} klientów." },
};

function t(text: LocaleText | undefined, locale = "en", fallback = ""): string {
  if (!text) return fallback;
  const language = locale.toLowerCase().split("-")[0];
  return text[locale] ?? text[language] ?? text.en ?? Object.values(text)[0] ?? fallback;
}

export function mount(element: HTMLElement, context: ModuleUiMountContext): () => void {
  const root = createRoot(element);
  root.render(<CustomerImportUpload context={context} />);
  return () => root.unmount();
}

function CustomerImportUpload({ context }: { context: ModuleUiMountContext }) {
  const { locale, services } = context;
  const { description, title } = context.props as ImportUploadProps;
  const importer = services.importer;
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [status, setStatus] = useState<ImportStatus>({ kind: "idle" });

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setRawContent(null);
    setStatus({ kind: "idle" });

    try {
      setRawContent(await services.files.readAsText(file));
    } catch {
      setStatus({ kind: "error", message: t(copy.readError, locale), errors: [] });
    }
  }

  async function handleImport() {
    if (!rawContent || !importer) return;
    setStatus({ kind: "saving" });

    try {
      const result = await importer.importContent(rawContent);
      if (!result.ok) {
        setStatus({
          kind: "error",
          message: result.error,
          errors: result.errors,
        });
        return;
      }
      setStatus({ kind: "done", count: result.count, errors: result.errors });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : t(copy.importError, locale),
        errors: [],
      });
    }
  }

  const inputId = "csv-customers-module-upload";
  const isSaving = status.kind === "saving";

  return (
    <section className="grid gap-3">
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-row items-center gap-2 px-4 pt-4 pb-1">
          <span className="text-primary" aria-hidden="true">
            ↑
          </span>
          <h2 className="text-base font-semibold">{t(title, locale, "Customer upload")}</h2>
        </div>
        <div className="grid gap-3 p-4">
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {t(description, locale, "Pick a CSV file with at least a customer name column.")}
          </p>

          <label
            htmlFor={inputId}
            className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background/60 px-4 py-4 text-center transition-colors hover:bg-muted/40"
          >
            <span className="text-2xl text-primary" aria-hidden="true">
              ↑
            </span>
            <span className="text-base font-semibold">
              {fileName ?? t(copy.chooseFile, locale)}
            </span>
            <span className="text-sm text-muted-foreground">
              {fileName ? t(copy.pickAnother, locale) : t(copy.dropOne, locale)}
            </span>
          </label>
          <input
            id={inputId}
            type="file"
            accept={(importer?.accept ?? [".csv", "text/csv"]).join(",")}
            className="sr-only"
            onChange={handleFileChange}
          />

          {rawContent ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleImport}
                disabled={isSaving || !importer}
                className="inline-flex h-8 w-fit items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                <span aria-hidden="true">↑</span>
                {isSaving ? t(copy.importing, locale) : t(copy.importAction, locale)}
              </button>
              <ImportStatusView status={status} locale={locale} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ImportStatusView({ status, locale }: { status: ImportStatus; locale?: string }) {
  if (status.kind === "done") {
    return (
      <>
        <StatusNotice tone="success">
          {t(copy.saved, locale).replace("{count}", String(status.count))}
        </StatusNotice>
        {status.errors.length > 0 ? (
          <StatusNotice tone="error">
            {t(copy.rowErrors, locale).replace("{count}", String(status.errors.length))}
          </StatusNotice>
        ) : null}
      </>
    );
  }

  if (status.kind !== "error") return null;

  return (
    <div className="flex flex-col gap-1">
      <StatusNotice tone="error">{status.message}</StatusNotice>
      {status.errors.map((error, index) => (
        <StatusNotice key={index} tone="error">
          {error.name ? `[${error.name}] ` : ""}
          {error.message}
        </StatusNotice>
      ))}
    </div>
  );
}

function StatusNotice({ children, tone }: { children: ReactNode; tone: "error" | "success" }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${
        tone === "success"
          ? "border-chart-4/60 bg-chart-4/15 text-foreground"
          : "border-destructive/50 bg-destructive/10 text-destructive"
      }`}
    >
      {tone === "success" ? "✓" : "⚠"}
      {children}
    </span>
  );
}

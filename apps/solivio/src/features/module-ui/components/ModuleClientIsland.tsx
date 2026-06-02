"use client";

import * as ReactRuntime from "react";
import { useEffect, useRef, useState } from "react";
import * as ReactJsxRuntime from "react/jsx-runtime";
import type * as ReactDomClientRuntime from "react-dom/client";
import * as ReactDomClient from "react-dom/client";

import type {
  ImportTarget,
  JsonObject,
  ModuleUiImportResult,
  ModuleUiMount,
  ModuleUiMountContext,
} from "@solivio/sdk";

type ModuleUiBundle = {
  solivioUiVersion?: number;
  mount?: ModuleUiMount;
};

type ImporterRuntimeConfig = {
  accept: string[];
  endpoint: string;
  target: ImportTarget;
};

type Props = {
  assetUrl: string;
  importer?: ImporterRuntimeConfig;
  locale: string;
  pageId: string;
  pluginProps: JsonObject;
};

const MODULE_UI_CONTRACT_VERSION = 1;

type SolivioModuleRuntime = {
  contractVersion: number;
  jsxRuntime: typeof ReactJsxRuntime;
  react: typeof ReactRuntime;
  reactDomClient: typeof ReactDomClientRuntime;
};

declare global {
  var __SOLIVIO_MODULE_RUNTIME__: SolivioModuleRuntime | undefined;
}

export function ModuleClientIsland({ assetUrl, importer, locale, pageId, pluginProps }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function mount() {
      const host = hostRef.current;
      if (!host) return;

      setError(null);
      host.replaceChildren();

      try {
        installSharedRuntime();

        const bundle = (await import(
          /* webpackIgnore: true */ /* turbopackIgnore: true */ assetUrl
        )) as ModuleUiBundle;

        if (cancelled) return;

        if (bundle.solivioUiVersion !== MODULE_UI_CONTRACT_VERSION) {
          throw new Error(
            `Unsupported module UI contract version: ${String(bundle.solivioUiVersion ?? "missing")}`,
          );
        }
        if (typeof bundle.mount !== "function") {
          throw new Error("Module UI bundle does not export mount(element, props).");
        }

        const maybeCleanup = bundle.mount(
          host,
          buildMountContext({ importer, locale, pageId, pluginProps }),
        );
        cleanup = typeof maybeCleanup === "function" ? maybeCleanup : undefined;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Module UI failed to load.");
        }
      }
    }

    mount();

    return () => {
      cancelled = true;
      try {
        cleanup?.();
      } catch {
        // Best-effort cleanup for third-party UI bundles.
      }
      hostRef.current?.replaceChildren();
    };
  }, [assetUrl, importer, locale, pageId, pluginProps]);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return <div ref={hostRef} className="contents" />;
}

function installSharedRuntime(): void {
  const existing = globalThis.__SOLIVIO_MODULE_RUNTIME__;
  if (existing) {
    if (existing.contractVersion !== MODULE_UI_CONTRACT_VERSION) {
      throw new Error(`Unsupported shared module UI runtime version: ${existing.contractVersion}.`);
    }
    return;
  }

  globalThis.__SOLIVIO_MODULE_RUNTIME__ = Object.freeze({
    contractVersion: MODULE_UI_CONTRACT_VERSION,
    jsxRuntime: ReactJsxRuntime,
    react: ReactRuntime,
    reactDomClient: ReactDomClient,
  });
}

function buildMountContext({
  importer,
  locale,
  pageId,
  pluginProps,
}: {
  importer: ImporterRuntimeConfig | undefined;
  locale: string;
  pageId: string;
  pluginProps: JsonObject;
}): ModuleUiMountContext {
  return {
    locale,
    pageId,
    props: pluginProps,
    services: {
      files: {
        readAsText(file) {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ""));
            reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
            reader.readAsText(file);
          });
        },
      },
      importer: importer
        ? {
            accept: importer.accept,
            target: importer.target,
            async importContent(content): Promise<ModuleUiImportResult> {
              const response = await fetch(importer.endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
              });
              const payload = await response.json().catch(() => null);
              const errors = Array.isArray(payload?.errors) ? payload.errors : [];
              if (!response.ok) {
                return {
                  ok: false,
                  error: payload?.error ?? `Request failed (${response.status})`,
                  errors,
                };
              }
              return {
                ok: true,
                count: typeof payload?.count === "number" ? payload.count : 0,
                errors,
              };
            },
          }
        : undefined,
    },
  };
}

"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@solivio/ui/components/button.tsx";

export function RunSyncButton() {
  const t = useTranslations("products-sync.page");
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runNow() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/products-sync/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          run?: { error?: string | null };
        };
        setError(body.run?.error ?? body.error ?? t("runFailed"));
      }
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" onClick={runNow} disabled={running}>
        <RefreshCw className={running ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
        {running ? t("running") : t("runNow")}
      </Button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

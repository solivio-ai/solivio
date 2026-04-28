"use client";

import { RefreshCcw, Server } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type HealthState =
  | { state: "checking" }
  | { state: "online"; timestamp: string }
  | { state: "offline"; message: string };

export function ApiStatus() {
  const [health, setHealth] = useState<HealthState>({ state: "checking" });

  const checkHealth = useCallback(async () => {
    setHealth({ state: "checking" });

    try {
      const response = await fetch("/api/health", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as { timestamp?: string };
      setHealth({
        state: "online",
        timestamp: payload.timestamp ?? new Date().toISOString()
      });
    } catch (error) {
      setHealth({
        state: "offline",
        message: error instanceof Error ? error.message : "API unavailable"
      });
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  return (
    <section className="flex min-h-12 items-center gap-3 rounded-lg border bg-card px-3 py-2 text-card-foreground" aria-label="API status">
      <Server size={18} aria-hidden="true" className="text-primary" />
      <div className="flex min-w-[110px] items-center gap-2 text-sm">
        <span
          className={`inline-block size-2 rounded-full ${
            health.state === "online"
              ? "bg-chart-4"
              : health.state === "checking"
                ? "bg-primary"
                : "bg-destructive"
          }`}
        />
        <span>
          {health.state === "online"
            ? "API online"
            : health.state === "checking"
              ? "Checking API"
              : "API offline"}
        </span>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={checkHealth} aria-label="Refresh API status">
        <RefreshCcw size={16} aria-hidden="true" />
      </Button>
    </section>
  );
}

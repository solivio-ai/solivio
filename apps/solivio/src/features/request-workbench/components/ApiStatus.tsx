"use client";

import { RefreshCcw, Server } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
    <section className="api-status" aria-label="API status">
      <Server size={18} aria-hidden="true" />
      <div>
        <span className={`status-dot ${health.state}`} />
        <span>
          {health.state === "online"
            ? "API online"
            : health.state === "checking"
              ? "Checking API"
              : "API offline"}
        </span>
      </div>
      <button type="button" className="icon-button" onClick={checkHealth} aria-label="Refresh API status">
        <RefreshCcw size={16} aria-hidden="true" />
      </button>
    </section>
  );
}

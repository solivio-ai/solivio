import "server-only";

import type { Logger } from "@solivio/sdk";

/**
 * Minimal structured logger handed to modules via ModuleContext. Tagged with the
 * module id (and any child bindings) and written as one JSON line per call.
 */
export function createModuleLogger(bindings: Record<string, unknown>): Logger {
  const write = (
    level: "debug" | "info" | "warn" | "error",
    msg: string,
    meta?: Record<string, unknown>,
  ) => {
    const line = JSON.stringify({ level, msg, ...bindings, ...meta });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };
  return {
    debug: (msg, meta) => write("debug", msg, meta),
    info: (msg, meta) => write("info", msg, meta),
    warn: (msg, meta) => write("warn", msg, meta),
    error: (msg, meta) => write("error", msg, meta),
    child: (extra) => createModuleLogger({ ...bindings, ...extra }),
  };
}

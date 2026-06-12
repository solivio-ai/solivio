import { getAi } from "@solivio/sdk/runtime";

/** Per-role model id resolved through the deployment AI config (core-owned). */
export function getModelFor(role: string): string {
  return getAi().modelFor(role);
}

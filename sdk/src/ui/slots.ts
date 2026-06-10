import type { ComponentType } from "react";

/**
 * UI injection points: core surfaces render `<Slot id="..." />` and modules
 * fill them via `src/slots.tsx` (`export const slots: SlotContributions`).
 *
 * Slot ids and their props are declared here (extensible by declaration
 * merging if a module needs to define its own slot surface).
 */
export interface SlotPropsMap {
  "dashboard.cards": Record<never, never>;
  "offer-detail.panel": { offerId: string };
  "import.panel": { target: "products" | "customers" };
}

export type SlotId = keyof SlotPropsMap;

export interface SlotContribution<K extends SlotId = SlotId> {
  /** Unique id, conventionally `<moduleId>.<name>`. */
  readonly id: string;
  /** May be a server or client component. */
  readonly component: ComponentType<SlotPropsMap[K]>;
  readonly order?: number;
}

export type SlotContributions = {
  [K in SlotId]?: ReadonlyArray<SlotContribution<K>>;
};

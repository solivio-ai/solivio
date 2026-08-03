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
  /**
   * The finalized-offer document area — content owned by whichever module
   * provides the bound `offer` channel (the PDF preview, today). The host
   * passes `providerId` from `getChannelProvider("offer")` so only that
   * module's contribution renders, even if another channel module is also
   * enabled.
   */
  "offer-detail.document": { offerId: string };
  /**
   * The finalized-offer primary action — what running the bound `offer`
   * channel looks like to the user (e.g. "Download PDF"). Same
   * `providerId` restriction as `offer-detail.document`.
   */
  "offer-detail.primaryAction": { offerId: string };
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

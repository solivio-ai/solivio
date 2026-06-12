import type { ComponentType } from "react";

/**
 * A navigation entry contributed by a module's `src/nav.tsx`
 * (`export const nav: NavEntry[]`). That file must stay client-safe:
 * icons and data only, no server imports.
 */
export interface NavEntry {
  /** Unique id, conventionally `<moduleId>.<name>`. */
  readonly id: string;
  readonly href: string;
  /** i18n key resolved as `<moduleId>.<labelKey>`. */
  readonly labelKey: string;
  readonly icon: ComponentType<{ className?: string }>;
  /** "admin" entries render only for admins. Default "main". */
  readonly section?: "main" | "admin";
  /** Stable sort order; ties broken by module load order. */
  readonly order?: number;
}

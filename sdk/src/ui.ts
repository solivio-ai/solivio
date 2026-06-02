import type { ImportTarget } from "./importer.js";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export const MODULE_UI_CONTRACT_VERSION = 1;

/** Plain localized text that can cross the server/client boundary safely. */
export type LocalizedText =
  | string
  | {
      default: string;
      locales?: Record<string, string>;
    };

/** Small core-owned icon allowlist. Modules name icons; the app decides how to render them. */
export type ModuleUiIcon =
  | "building"
  | "file-text"
  | "layout-dashboard"
  | "package"
  | "plus"
  | "upload"
  | "users";

export type ModuleUiSection = "admin";

export interface ModuleUiCopyBlock {
  title: LocalizedText;
  description?: LocalizedText;
}

/**
 * A module-owned browser bundle mounted into a host-provided DOM island.
 * The bundle exports `mount(element, props)` and owns its own React root/runtime.
 */
export interface ModuleClientIslandPage extends ModuleUiCopyBlock {
  id: string;
  kind: "client-island";
  /** Browser ESM asset emitted into the module bundle, e.g. "ui/import-products.mjs". */
  clientEntry: string;
  /** Optional importer binding so the core can pass an exact import endpoint + accept list. */
  target?: ImportTarget;
  importerName?: string;
  icon?: ModuleUiIcon;
  order?: number;
  props?: JsonObject;
}

export type ModuleUiPage = ModuleClientIslandPage;

export interface ModuleUiNavItem {
  id: string;
  section: ModuleUiSection;
  pageId: string;
  label: LocalizedText;
  icon?: ModuleUiIcon;
  order?: number;
}

export interface ModuleUiContributions {
  pages?: ModuleUiPage[];
  navItems?: ModuleUiNavItem[];
}

export interface ModuleUiImportRowError {
  index?: number;
  message: string;
  name?: string;
  sku?: string;
}

export type ModuleUiImportResult =
  | {
      ok: true;
      count: number;
      errors: ModuleUiImportRowError[];
    }
  | {
      ok: false;
      error: string;
      errors: ModuleUiImportRowError[];
    };

export interface ModuleUiImporterService {
  accept: string[];
  target: ImportTarget;
  importContent(content: string): Promise<ModuleUiImportResult>;
}

export interface ModuleUiFileService {
  readAsText(file: File): Promise<string>;
}

export interface ModuleUiServices {
  importer?: ModuleUiImporterService;
  files: ModuleUiFileService;
}

export interface ModuleUiMountContext<TProps extends JsonObject = JsonObject> {
  locale: string;
  pageId: string;
  props: TProps;
  services: ModuleUiServices;
}

export type ModuleUiCleanup = () => void;
export type ModuleUiMount<TProps extends JsonObject = JsonObject> = (
  element: HTMLElement,
  context: ModuleUiMountContext<TProps>,
) => ModuleUiCleanup | undefined;

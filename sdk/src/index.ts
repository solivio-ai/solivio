// ── Module definition ───────────────────────────────────────────────────────

// ── Capability surfaces ──────────────────────────────────────────────────────
export type { AgentTool } from "./agent-tool.js";
export { defineAgentTool } from "./agent-tool.js";
export type {
  DefineModuleConfig,
  ModuleContributions,
  ModuleFactory,
} from "./define-module.js";
export { defineModule } from "./define-module.js";
// ── Entity DTOs ──────────────────────────────────────────────────────────────
export type {
  CustomerInput,
  OfferImportInput,
  OfferImportLineItem,
  OfferItemView,
  OfferSnapshot,
  OfferSnapshotLineItem,
  OfferView,
  ProductInput,
  ProductMatch,
} from "./entities/index.js";
export type { EventSubscriber } from "./event-subscriber.js";
export type {
  AnyImporterDefinition,
  CustomerImporterDefinition,
  ImporterDefinition,
  ImportResult,
  ImportRowError,
  ImportStatus,
  ImportTarget,
  OfferImporterDefinition,
  ProductImporterDefinition,
} from "./importer.js";
// ── Module context (the seam to shared infrastructure) ───────────────────────
export type {
  AiClientFactory,
  ConfigResolver,
  EventBus,
  Logger,
  ModuleContext,
} from "./module-context.js";
export type { RendererDefinition } from "./renderer.js";
// ── Canonical core services ──────────────────────────────────────────────────
export type {
  BulkAddItemResult,
  BulkAddResult,
  CoreServices,
  OfferDeleteResult,
  OfferLineItemInput,
  OfferMutationResult,
  OfferService,
  ProductSearchOptions,
  ProductService,
} from "./services.js";
export type { TestContextOverrides } from "./testing.js";
// ── Testing ──────────────────────────────────────────────────────────────────
export { createTestContext } from "./testing.js";

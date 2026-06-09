// ── Module definition (v2 manifest model) ───────────────────────────────────

// ── Capability surfaces ──────────────────────────────────────────────────────
export type { AgentTool } from "./agent-tool.js";
export { defineAgentTool } from "./agent-tool.js";
// ── Legacy module definition (runtime-loader model; deleted with the loader) ─
export type {
  DefineModuleConfig,
  ModuleContributions,
  ModuleFactory,
} from "./define-module.js";
export { defineModule as defineLegacyModule } from "./define-module.js";
// ── Entity DTOs ──────────────────────────────────────────────────────────────
export type {
  CustomerInput,
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
  ProductImporterDefinition,
} from "./importer.js";
export type { AnyJobDefinition, JobDefinition } from "./job.js";
export { defineJob } from "./job.js";
export type { ModuleManifest } from "./module.js";
export { defineModule } from "./module.js";
// ── Module context (the seam to shared infrastructure) ───────────────────────
export type {
  AiClientFactory,
  ConfigResolver,
  EventBus,
  Logger,
  ModuleContext,
} from "./module-context.js";
export type { EventName, Events, ServiceName, Services } from "./registries.js";
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
export type { AnySubscriberDefinition, SubscriberDefinition } from "./subscriber.js";
export { defineSubscriber } from "./subscriber.js";
export type { TestContextOverrides } from "./testing.js";
// ── Testing ──────────────────────────────────────────────────────────────────
export { createTestContext } from "./testing.js";
export type { NavEntry } from "./ui/nav.js";
export type {
  SlotContribution,
  SlotContributions,
  SlotId,
  SlotPropsMap,
} from "./ui/slots.js";

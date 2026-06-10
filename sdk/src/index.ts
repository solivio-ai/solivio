/// <reference path="./ambient.d.ts" />

// ── Module definition (v2 manifest model) ───────────────────────────────────

// ── Capability surfaces ──────────────────────────────────────────────────────
export type { AgentTool } from "./agent-tool.ts";
export { defineAgentTool } from "./agent-tool.ts";
// ── Legacy module definition (runtime-loader model; deleted with the loader) ─
export type {
  DefineModuleConfig,
  ModuleContributions,
  ModuleFactory,
} from "./define-module.ts";
export { defineModule as defineLegacyModule } from "./define-module.ts";
// ── Entity DTOs ──────────────────────────────────────────────────────────────
export type {
  CustomerInput,
  OfferItemView,
  OfferSnapshot,
  OfferSnapshotLineItem,
  OfferView,
  ProductInput,
  ProductMatch,
} from "./entities/index.ts";
export type { EventSubscriber } from "./event-subscriber.ts";
export type {
  AnyImporterDefinition,
  CustomerImporterDefinition,
  ImporterDefinition,
  ImportResult,
  ImportRowError,
  ImportStatus,
  ImportTarget,
  ProductImporterDefinition,
} from "./importer.ts";
export type { AnyJobDefinition, JobDefinition } from "./job.ts";
export { defineJob } from "./job.ts";
export type { ModuleManifest } from "./module.ts";
export { defineModule } from "./module.ts";
// ── Module context (the seam to shared infrastructure) ───────────────────────
export type {
  AiClientFactory,
  ConfigResolver,
  EventBus,
  Logger,
  ModuleContext,
} from "./module-context.ts";
export type { CoreUsersService, EventName, Events, ServiceName, Services } from "./registries.ts";
export type { RendererDefinition } from "./renderer.ts";
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
} from "./services.ts";
export type { AnySubscriberDefinition, SubscriberDefinition } from "./subscriber.ts";
export { defineSubscriber } from "./subscriber.ts";
export type { TestContextOverrides } from "./testing.ts";
// ── Testing ──────────────────────────────────────────────────────────────────
export { createTestContext } from "./testing.ts";
export type { NavEntry } from "./ui/nav.ts";
export type {
  SlotContribution,
  SlotContributions,
  SlotId,
  SlotPropsMap,
} from "./ui/slots.ts";

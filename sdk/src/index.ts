/// <reference path="./ambient.d.ts" />

// ── Module definition ─────────────────────────────────────────────────────────
export type { AgentTool } from "./agent-tool.ts";
export { defineAgentTool } from "./agent-tool.ts";
// ── Entity DTOs (import surface for importer capabilities) ────────────────────
export type { CustomerInput, ProductInput, ProductMatch } from "./entities/index.ts";
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
// ── Shared infrastructure types ───────────────────────────────────────────────
export type { AiClientFactory, Logger } from "./module-context.ts";
export type {
  CoreUsersService,
  EventName,
  Events,
  ServiceName,
  Services,
} from "./registries.ts";
export type { AnySubscriberDefinition, SubscriberDefinition } from "./subscriber.ts";
export { defineSubscriber } from "./subscriber.ts";
// ── UI contributions ──────────────────────────────────────────────────────────
export type { NavEntry } from "./ui/nav.ts";
export type {
  SlotContribution,
  SlotContributions,
  SlotId,
  SlotPropsMap,
} from "./ui/slots.ts";

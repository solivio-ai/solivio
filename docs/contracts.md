# Solivio Contracts

Status: **placeholder** — settled when the SDK is extracted
Last updated: 2026-05-07

This document is the contract between the core and modules: canonical schemas, named pipeline transitions, and the typed service interfaces modules call. It is the second-most stable document in the repo (after `architecture.md`) once written.

It is intentionally empty for now. The architecture document describes the *shape* of these contracts; the exact column lists, transition names, and method signatures are deferred until at least one real external module forces them to be specific.

## Scope (what will live here)

- **Canonical entity schemas**: `Request`, `Requirement`, `Customer`, `Product`, `Offer`, `OfferRevision`, `AcceptedSnapshot`, `AuditEvent`, `DispatchRecord`, `LearningEvent`.
- **Named pipeline transitions**: the full set with their preconditions, postconditions, and observer events. Today's working set is `request_created`, `requirements_extracted`, `enrichment_loaded`, `draft_generated`, `validation_passed`, `offer_accepted`, `artifact_rendered`, `dispatch_completed`, `agent_failed`, `dispatch_failed`, `feedback_captured`. The exact list is not yet final.
- **Core service interfaces**: the typed handles modules call, e.g. `services.products.import(dto)`, `services.offers.transition(id, target, reason)`, `services.requests.create(dto)`, `services.feedback.record(dto)`, `services.dispatch.record(dto)`.
- **Module manifest schema**: the shape of `manifest` that every module exports.
- **Capability tags**: which capabilities are `tool` mode vs `always-loaded` mode by default, and which agents expect them.
- **FK and cascade policy**: when a module table FKs to a canonical table, what `ON DELETE` / `ON UPDATE` is allowed (see `architecture.md` §3.2).
- **Validation rule type taxonomy**: `PriceRule`, `MarginRule`, `LegalRule`, `StockRule`, …

## Why deferred

The architecture commits to the *existence* of these contracts. Their *exact shape* should be set by at least one real external integration (the worked Odoo example in the original plan, or its successor). Locking the column lists or method signatures before that point is a guess; locking them after that point is a test the architecture has actually survived contact with reality.

Once the first external module exists end-to-end, this document is filled in and frozen with version-bumped breaking-change discipline.

## Until then

- The PoC's existing schema (`apps/solivio/src/server/database/schema.ts`) is the de facto canonical schema. It will move and reshape during the core/module split; treat it as working state, not as the contract.
- New canonical entities introduced during the split should be added to the de facto schema with conservative naming. They get formalized here when this document is written.
- Modules in v0 are first-party. They consume internal types from `packages/domain` (or successor) directly. The SDK extraction (and this document with it) happens after those internal types stabilize.

# ADR 0004 — Jobs and events on pg-boss

Status: **accepted**
Date: 2026-06-10

## Context

Modules need background work (scheduled syncs, retried side effects) and a way to react
to each other's domain events without importing each other. The architecture had long
reserved "job queue" and "observer events"; the products-sync module made them
concrete: a cron-schedulable sync job and a `products-sync.run.completed` event. The
default demo path must stay free of new required services.

## Decision

**pg-boss over the existing Postgres** is the queue — no new infrastructure. The same
`DATABASE_URL` the app already requires backs persistent jobs, retries, and cron
scheduling; pg-boss manages its own tables outside the Drizzle journals.

**Events are typed and two-tier:**

- Modules declare events by augmenting the SDK `Events` interface
  (`<moduleId>.<entity>.<action>`); `emitEvent()` is fully typed.
- **In-process subscribers** (default) run inline at emit time; errors are logged,
  never thrown into the emitter. Cheap, immediate, lost on crash.
- **Persistent subscribers** (`persistent: true` in `defineSubscriber`) are delivered
  through a pg-boss queue per subscriber (`subscriber:<id>`) — at-least-once, with
  retries.

**Jobs** are files under `src/jobs/` (`defineJob`): a module-prefixed name, a handler,
a retry limit, and an optional cron `schedule` that may be a **function resolved at
boot** — the runtime is initialized by then, so a module can derive its schedule from
deployment options (`products-sync.run` reads its `cron` option this way). Ad hoc
enqueueing goes through `enqueueJob()`.

**The worker runs inside the Next.js server process today.**
`instrumentation.ts` → `startJobEngine()` registers every job queue, cron schedule, and
persistent-subscriber queue, and hands the SDK runtime its `enqueue` hook. Because all
module code reaches the engine only through SDK accessors, the engine can later be
split into a standalone worker process (same generated registries, same boot) without
touching any module.

## Alternatives

- **graphile-worker** (the earlier candidate) — also Postgres-backed; pg-boss won on
  built-in cron scheduling, queue-per-name semantics that map directly onto jobs and
  persistent subscribers, and a simpler API for the in-app worker.
- **Redis-backed queues (BullMQ)** — rejected: adds a required external service to the
  default demo path.
- **In-memory only (no queue)** — rejected: no persistence, retries, or schedules;
  events would silently drop on restart.

## Consequences

- Persistent delivery is **at-least-once** — persistent subscriber handlers must be
  idempotent. In-process subscribers are best-effort by design.
- Cron and queue workers share the app process for now: long-running handlers compete
  with request serving. Acceptable at current scale; the split-out worker is the
  designated escape hatch.
- pg-boss's schema lives in the shared database but outside Drizzle's journals — it
  upgrades itself; never write Drizzle migrations against it.
- `enqueueJob` throws in a deployment where the engine has not started (the runtime's
  `enqueue` hook is optional by type); the standard image always starts it.

# ADR 0005 — Channels as the output capability

Status: **accepted**
Date: 2026-07-31

## Context

Accepting an offer should be able to *do something*, and what it does belongs to the
deployment: render a PDF for the salesperson, push a sale order into an ERP, email the
customer. None of that was pluggable — PDF rendering was hardcoded inside the offers
module across three routes and a `components/offer-pdf/` tree, and `../architecture.md`
listed "renderers and channels" as future surfaces with no contract behind them.

## Decision

**One capability kind, `channel`, covers every output.** A channel takes a finalized
domain entity and does something outward with it. `ChannelTarget` names the entity
(`"offer"` today), `channels.ts` at a module's root declares providers, and the runtime
resolves the bound one with `getChannel(target)`.

We keep the name **channel** — already the word `../architecture.md` reserved for this
surface — and fold "renderers" into it rather than shipping two kinds. A PDF renderer and
an ERP push differ only in what they hand back, which the result type already expresses.

**`ChannelResult` is a union**, not bytes:

| kind | meaning | example |
|---|---|---|
| `document` | a file the caller streams or stores | the offer PDF |
| `reference` | a record created elsewhere | a CRM/ERP record id |
| `acknowledged` | done, nothing to hand back | an email was sent |

**Channels are effectful, importers are pure.** An importer is a transform whose records
the core persists; a channel performs its own side effect, because only the provider knows
SMTP or a third-party REST API's shape. Keeping channels pure would require the core to learn every
protocol. This asymmetry is deliberate — the two capabilities point in opposite directions.

**A channel's input is a domain entity**, not a raw payload and not a type owned by the
consuming module. That is what lets `modules/offer-pdf/` render an offer without depending
on `modules/offers/`.

The target → input mapping is an **open interface** (`ChannelInputMap`) merged by whoever
owns the entity — `@solivio/domain` declares `offer` — with `ChannelTarget = keyof
ChannelInputMap`. The first attempt instead imported `Offer` into the SDK directly, which
widened the contract package's dependency graph to buy two convenience aliases while
leaving the caller side typed as `unknown`. Merging inverts that: the SDK depends on
nothing new, adding a target is additive, and `getChannel(target)` is generic in the target
so both provider and caller are checked against the same input type.

**Exactly one channel per target**, bound in `solivio.config.ts` (`"offer.channel":
"offer-pdf/pdf"`), resolved exactly like importers: an explicit binding wins, a sole
provider is used implicitly, ambiguity is an error naming the fix.

**The channel's UI follows its binding.** A channel's document preview and primary action
are the *channel's* UI, not the owning module's, so the accepted-offer screen hosts two
slots — `offer-detail.document` and `offer-detail.primaryAction` — and renders only the
contribution belonging to the module currently bound. Mechanically: the generator tags every
contribution with its module id while merging, `Slot` takes an optional `providerId` to
restrict a slot to one module, `hasSlotContribution(id, providerId)` lets a host skip
chrome nothing will fill, and `getChannelProvider(target)` reports which module backs the
binding. `offers` therefore hosts the slots while staying ignorant of what fills them:
after the extraction it has no PDF dependency at all.

## Alternatives rejected

- **Two kinds (`renderer` + `channel`).** Doubles the surface — discovery, registry,
  resolver, docs — to encode a distinction the result union already carries.
- **Bytes-only results.** Would force an ERP channel to invent a document it does not
  produce, or to return an empty buffer and report success out of band.
- **Many channels per target, fanned out.** Rejected for now: it needs an answer for
  partial failure (offer accepted, two of three channels succeeded) and for ordering.
  Exclusive-per-target defers that until a deployment actually needs both.
- **Leave the PDF inside offers and register it there.** Cheaper, but then the only
  provider lives in the consuming module and nothing proves a third-party provider can
  plug in.
- **An `offers.offer.accepted` event with subscribers instead of a capability.** Events are
  observers with no return value; a document has to come back to the request that asked
  for it. The two compose later — a subscriber can invoke a channel — but the event alone
  cannot serve `/api/offers/{offerId}/pdf`.
- **Additive channel UI (every enabled provider's contribution renders).** No new machinery,
  and fine for a deployment enabling exactly one channel module — but a deployment enabling
  two gets two competing primary actions, one of which cannot work because it is not the
  bound one. Not hypothetical: an ERP module doing product sync *and* providing a channel
  would coexist with `offer-pdf` normally.
- **A separate channel-UI capability kind** (e.g. `channel-ui.tsx` keyed to the channel, so
  the binding selects UI by construction). More explicit, but a whole new capability —
  discovery, registry, host, docs — to express something a `providerId` filter on the
  existing slot registry already covers.

## Consequences

- Adding a destination needs **no core change**: a module (`package.json`, `tsconfig.json`,
  `src/index.ts` manifest) whose capability is a single `src/channels.ts`, plus `slots.tsx`
  and `i18n/` if it wants UI on the accepted-offer screen. `modules/offer-pdf/` is the
  working example, and carries no routes, tables, or services at all.
- **Binding a second target-`offer` channel replaces the first — and the accepted-offer UI
  follows.** `getChannelProvider(target)` reports which module backs the binding, resolved
  server-side in `[offerId]/page.tsx` and threaded down as `channelModuleId`. The generated
  `Slot` accepts a `providerId` that restricts a slot to one module's contribution (every
  module's slot content is tagged with its module id during merge), and
  `hasSlotContribution` lets the view drop the document column entirely when the bound
  channel has none — rather than rendering a broken preview for a channel that never
  produces a document. Both providers stay enabled simultaneously without their UI
  colliding; only the bound one is shown.
- `/api/offers/{offerId}/pdf` keeps its URL but no longer guarantees a PDF: it returns 500
  with `CHANNEL_HAS_NO_DOCUMENT` if the configured channel produces something else. That
  route resolves the channel itself (`getChannel`, not the UI's `getChannelProvider`) and is
  unaffected by which module's UI is showing.
- Of the three PDF route handlers that existed before, only that one survives. The sample
  render and render-from-payload handlers (both on `/api/offers/pdf`) were **deleted**, not
  relocated: nothing called them, and they rendered PDFs on an unauthenticated endpoint. The
  cost is that producing real PDF bytes on demand now requires an actual accepted offer —
  `offer-pdf`'s unit test stubs `renderToBuffer`, so rendering has no automated coverage.
- Nothing runs automatically on acceptance yet. `offers` emits no accept event, so
  invocation is explicit; wiring auto-run is additive.

## A rule for destination modules: never `getChannel` your own trigger

`getChannel(target)` resolves whatever the *deployment* bound — useful for a shared route
like `/api/offers/{offerId}/pdf` that must do whatever the configured channel does. It is
the wrong call for a destination module's own action trigger (a button, a route) whose whole
point is running *that specific* channel.

If a module owns a destination and exposes its own "run this now" surface, that surface must
invoke its own exported channel definition directly (`import { theChannel } from
"./channels.ts"`, then `theChannel.run(input)`), not `getChannel(target)`.

Where this bites is a surface reachable **regardless of the binding** — a module's own admin
page or route, which is the likely shape for an ERP export. Such a route calling
`getChannel("offer")` would run whichever channel the deployment bound, so with the PDF bound
an "export to the ERP" request would render a PDF and report success. (A button contributed
through `offer-detail.primaryAction` cannot hit this, since `providerId` means it only
renders when its own module is bound — but the route behind it is still reachable directly,
so the rule holds for the route either way.)

A destination module needing to load the entity itself (e.g. a button given only an id)
depends on the owning module's service the ordinary way (`dependsOn: ["offers"]`,
`getService("offers").getOffer(id)`) — this is a normal cross-module service call, not a
channel concern.

This rule was learned and validated against a throwaway second provider built to exercise
exactly this seam (a mock destination with its own trigger route, its own `offer-detail.*`
slot contributions, and a non-`document` result) before being removed once the pattern was
confirmed and written down here.

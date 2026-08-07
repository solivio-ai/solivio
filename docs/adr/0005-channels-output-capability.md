# ADR 0005 — Channels as the output capability

Status: **accepted**
Date: 2026-08-04

## Context

Accepting an offer should be able to *do something*, and what it does belongs to the
deployment: render a PDF for the salesperson, push a sale order into an ERP, email the
customer. None of that was pluggable — PDF rendering was hardcoded inside the offers
module across three routes and a `components/offer-pdf/` tree, and `../architecture.md`
listed "renderers and channels" as future surfaces with no contract behind them.

## Decision

**One capability kind, `channel`, covers every output.** A channel marks a module as a
destination for a target's finalized entities. `ChannelTarget` names the entity (`"offer"`
today), `channels.ts` at a module's root declares providers, and the deployment binds one
per target in `solivio.config.ts` (`"offer.channel": "offer-pdf/pdf"`) — resolved exactly
like importers: an explicit binding wins, a sole provider is used implicitly, ambiguity is
an error naming the fix, and no provider at all is a legitimate state.

**Several modules may act on the same target; the binding decides only who owns the
document area.** A deployment wants a PDF for the customer *and* a push to a back-office
system — those are not alternatives. See "Exclusivity is narrow" below.

We keep the name **channel** — already the word `../architecture.md` reserved for this
surface — and fold "renderers" into it rather than shipping two kinds.

### A channel is a declaration, not a callable

```ts
export interface ChannelDefinition {
  name: string;
  description: string;
  target: ChannelTarget;
}
```

There is no `run`, and the core never invokes a channel. It resolves which one is bound and
stops there. The provider receives the entity **through slots** and owns everything it does
with it:

- effects that need a server — rendering, credentials, a remote API — live in the module's
  own API routes,
- effects that should happen with nobody watching live in the module's own subscribers.

**This reverses the first cut of this ADR**, which gave channels a
`run(input) => Promise<ChannelResult>` that a shared route called. That design was
implemented and then removed before shipping, because building it exposed three things:

1. **Its only possible caller was not actually generic.** `/api/offers/{offerId}/pdf` called
   `run()` and then returned 500 for two of the three `ChannelResult` variants. A caller that
   handles one variant is a PDF route with indirection, not a polymorphic consumer.
2. **The motivating caller was forbidden from using it.** A destination module with its own
   export button had to invoke its own definition directly, never `getChannel(target)` —
   otherwise, with the PDF bound, an "export to the ERP" request would render a PDF and report
   success. So the callable was designed for a caller the rules did not permit to exist.
3. **Two of the three result variants had no producer and no consumer** anywhere in the tree.
   `reference` and `acknowledged` encoded a hypothetical.

Meanwhile the *slot* machinery was doing all the real work of making the accepted-offer
screen pluggable. Dropping the callable leaves three mechanisms that already existed —
binding, slots, services/events — instead of a fourth that duplicated them.

### The entity reaches the provider through slots

The accepted-offer screen hosts `offer-detail.document` and `offer-detail.actions`.
Mechanically: the generator tags every contribution with its module id while merging, `Slot`
takes an optional `providerId` to restrict a slot to one module,
`hasSlotContribution(id, providerId)` lets a host skip chrome nothing will fill, and
`getChannelProvider(target)` reports which module backs the binding. `offers` hosts the slots
while staying ignorant of what fills them.

### Exclusivity is narrow: the document, not the actions

`offer-detail.document` is **exclusive** — restricted to the bound module, because one
preview owns that column and a second would fight it for layout.

`offer-detail.actions` is **additive** — every contributing module's button renders, with no
binding required.

An earlier cut made both exclusive, and rejected additive actions on the grounds that a
deployment enabling two channel modules would get competing actions, "one of which cannot
work because it is not the bound one". That argument was circular: the losing button failed
*because* of the binding. With the callable gone, each contribution posts to its own module's
route, so several coexist and all of them work.

The other stated reason for exclusivity — that fanning out needs answers for partial failure
and ordering — was also an artifact of the callable. Nothing fans out: the core invokes
nothing, each provider triggers itself, and partial failure is each module's own business.
Exclusivity survives only where it earns its keep, which is the shared document column.

Both slots hand over the **whole `Offer`**, not its id. The host already holds it client-side
(`OfferAcceptedView` is a client component taking `offer: Offer`) and every field is
serializable, so passing an id would force every provider to re-fetch what was already there.

**Where the target and the slot props are declared** is `@solivio/domain`, by merging into
the SDK's open `ChannelTargets` and `SlotPropsMap`. Not the SDK, which would then need a
dependency on the entity packages; not `modules/offers`, which hosts the slots but cannot be
imported by a provider module. Host and provider both depend on `@solivio/domain`, so both
see the declaration.

### The rule for provider routes: take an id, re-fetch

**A provider's route must never accept the entity as a request body**, even though the slot
component linking to it already holds one. Slot props live in the browser and can be edited;
a route that trusts a posted entity lets any session render — or transmit to a third-party
system — whatever the caller made up. This is the same failure mode as the
render-from-payload route deleted below.

The consequence is that a provider owning a route depends on the entity's module the ordinary
way (`dependsOn: ["offers"]`, `getService("offers").getOffer(id)`). `offer-pdf` does exactly
this. The alternative — rendering client-side from the slot props — avoids the dependency for
a *renderer* but not for a destination that must reach a remote system, so the dependency is
the general shape.

## Alternatives rejected

- **A callable `run` on the channel** — the first cut of this ADR. See above.
- **Two kinds (`renderer` + `channel`).** Doubles the surface — discovery, registry, resolver,
  docs — to encode a distinction that no longer exists once channels stop returning anything.
- **Core-orchestrated fan-out** (the core invoking every provider for a target and reporting
  per-destination results). Still rejected — it needs answers for partial failure and
  ordering — but note this is *not* what "several modules act on one offer" requires. They
  coexist because each owns its own trigger, with no orchestrator to hold the bag.
- **Leave the PDF inside offers and register it there.** Cheaper, but then the only provider
  lives in the consuming module and nothing proves a third-party provider can plug in.
- **Bind the slots directly in config** (`"offer-detail.document": "offer-pdf"`), with no
  `channels.ts` at all. The logical endpoint of removing the callable, and smaller still — but
  a deployment would bind each slot independently with nothing keeping them consistent, and
  would lose the single readable knob for "what this deployment does with accepted offers".
- **Additive UI for *both* slots.** Adopted for actions (see above), rejected for the document:
  two previews in one column is a layout problem no binding-free rule solves.
- **A separate channel-UI capability kind** (e.g. `channel-ui.tsx` keyed to the channel). More
  explicit, but a whole new capability to express something a `providerId` filter on the
  existing slot registry already covers.
- **An `offers.offer.accepted` event with subscribers instead of a capability.** Not an
  alternative — the two compose. The event now exists and is how a module acts on acceptance
  unattended; the channel declaration and its slots are how a module acts on the *screen*. A
  destination module typically wants both.

## Consequences

- Adding a destination needs **no core change**: a module (`package.json`, `tsconfig.json`,
  `src/index.ts` manifest) declaring `src/channels.ts`, plus `slots.tsx` and `i18n/` for UI and
  its own `api/` routes for effects. `modules/offer-pdf/` is the working example.
- **Binding a second target-`offer` channel replaces the first — and the accepted-offer UI
  follows.** Both providers stay enabled simultaneously without their UI colliding; only the
  bound one is shown.
- **The PDF URL moved** from `/api/offers/{offerId}/pdf` to `/api/offer-pdf/{offerId}`, owned by
  `offer-pdf`. It no longer needs a "the configured channel produced something else" failure
  mode, because the route belongs to the module that renders. Of the three PDF handlers that
  existed originally, the other two (both on `/api/offers/pdf`) were **deleted**, not
  relocated: nothing called them, and they rendered PDFs on an unauthenticated endpoint.
- **`offer-pdf` depends on `offers`.** The removed callable had the core load the entity, which
  kept providers dependency-free; that property only ever held for a provider with no trigger
  of its own, and both realistic providers have one.
- `renderOfferPdf`'s test stubs `renderToBuffer`, so actual PDF byte output still has no
  automated coverage.
- **A headless destination is no longer a channel.** "Email the customer on accept" is a module
  with a subscriber and no slot contributions — mechanically fine, but the config binding stops
  describing it.
- **Acceptance is observable.** `offers` emits `offers.offer.accepted` after the transaction
  commits and only on a real transition, so a module can act on a finalized offer with no user
  click — `persistent: true` for anything reaching a remote system, so it retries. Combined
  with the slot split, the answer to "who decides when a channel acts" is unambiguously *the
  module*: through its own button, its own route, or its own subscriber. The core decides
  nothing beyond which module owns the document column.

<p align="center">
  <img src="./solivio-logo.png" alt="Solivio" width="360" />
</p>

<p align="center">
  <strong>Stop building quotes. Start closing deals.</strong>
  <br />
  <strong>Fix your quoting process - using your data and knowledge.</strong>
</p>

Solivio is an open-source product created by Derave Software.

It combines an implementation process with an open-source software foundation built for companies where product catalogs contain thousands of items and quotes often include dozens of line items.

Solivio helps teams move from manual quoting to a data- and knowledge-driven process. Instead of rebuilding every quote from scratch, it uses AI plus connected business context to prepare a draft quote that the sales team reviews, adjusts, validates, and moves further through the organization.

## 💡 What Solivio Is

Solivio is designed for companies where quoting is too complex, too manual, and too dependent on individual experience.

It is especially relevant when the business operates with:

- 📦 large product catalogs
- 🧩 many configurable or multi-line offers
- 🧠 data scattered across ERP, CRM, price lists, documents, and people's heads
- ✅ approval-heavy processes
- ⏳ long onboarding time for new sales team members

Solivio is both an implementation process and an open-source software product. The goal is not to replace the sales team. The goal is to reduce repetitive operational work, standardize quoting, and help teams respond faster with more consistency.

Solivio is also meant to support consultative selling. It should connect many data points and help teams generate the best possible quote, not only the fastest one.

## 🚨 Why Solivio Exists

In many organizations, quoting is still a fragmented process:

- 🧑‍💼 senior sales team members spend time on operational work instead of selling
- 🌱 new sales team members need months to become effective
- 📝 every quote is built slightly differently
- 🚦 approvals, pricing, and product knowledge create bottlenecks
- 🔗 ERP, CRM, Excel, price lists, and internal know-how do not work as one system

The result is slow response time, inconsistent quality, onboarding friction, and limited ability to scale sales operations.

Solivio exists to solve that operational gap.

## 🛠️ How Solivio Works

Solivio shortens the quoting process through an AI-assisted workflow:

1. 📥 A customer sends an inquiry.
2. 🔎 Solivio reads the inquiry together with connected sources such as product catalogs, CRM, ERP, FAQ, customer profile, pricing policies, product instructions, industry knowledge, and additional `.md` guidance files.
3. 🧠 The system extracts requirements, searches for matching products, and prepares recommendations.
4. 🧾 Solivio generates a draft quote.
5. 👥 The sales team reviews it, edits it if needed, validates it, and accepts it.
6. 🚀 The accepted draft moves into downstream steps defined during implementation, such as ERP sync or final PDF generation.

Each implementation starts with mapping the real quoting process inside the client organization. What happens after the draft is generated depends on that mapped workflow.

## 🔥 Business Problems Solivio Solves

Solivio focuses on the bottlenecks that make quoting difficult to scale:

1. ⏳ Onboarding slows down growth. New sales team members need months to become effective, so team expansion takes too long.
2. 💸 Senior team members are trapped in operations. Top performers spend time building quotes and supporting juniors instead of generating revenue.
3. 📏 Quote quality depends on the person, not the process. Juniors work slower, seniors work faster, and consistency suffers.
4. 📈 Quoting does not scale with demand. Every additional inquiry creates more manual work and more chaos.
5. 🔌 Data is fragmented across systems. ERP, CRM, Excel, price lists, and internal know-how require repeated copy-paste work.

## 📈 What Business Outcome It Aims For

Solivio is meant to help companies:

- ⚡ shorten quote turnaround time
- 🧹 reduce manual operational work and retyping into ERP or quoting systems
- 📏 standardize quote quality across the team
- 🧑‍🏫 make onboarding less dependent on senior team members
- 🚀 improve sales capacity without growing chaos
- 🔁 create a more scalable quoting process

## 🔮 Product Direction

Solivio aims to become the layer between customer inquiry and final offer by providing:

- 🤖 automatic draft quote generation based on data
- 🔗 CRM, ERP, FAQ, price-list, and knowledge-base integration
- 🧩 support for configurable products and bundles
- ✅ approval-aware workflows such as discount acceptance
- 📍 a central source of truth about product and customer context
- 🚀 faster onboarding for sales teams
- 📬 support for multiple channels such as email, phone, and B2B workflows

## 🌍 Open-Source Repository

This repository contains the open-source groundwork for Solivio and is intentionally kept easy to launch for contributors evaluating the idea.

- 🖥️ `apps/solivio` contains the main Next.js app
- 🌐 `apps/solivio/src/app/api` contains HTTP API routes
- ✨ `apps/solivio/src/features` contains user-facing feature UI
- 🔒 `apps/solivio/src/server` contains server-only integrations and services
- 📦 `packages/domain` contains shared types, workflow constants, and mock fixtures
- 🐘 `infra/postgres` contains local database bootstrap files
- 🗃️ `apps/solivio/drizzle` contains the database migrations applied by `yarn db:migrate`

Mocks are preferred until data models and integration boundaries are clear.

## 🚀 Local Setup

Requirements:

- Node.js `>=24.15.0`
- Yarn `>=4.14.1`
- Docker

Start from source:

```bash
yarn install
cp apps/solivio/.env.example apps/solivio/.env.local
yarn setup
yarn dev
```

Environment notes:

- `BETTER_AUTH_SECRET` — any non-trivial string works locally; generate a
  strong one (`openssl rand -base64 32`) for production only.
- `OPENAI_API_KEY` — optional. Without it the AI agents are unavailable and
  products import without embeddings (semantic search disabled, text search
  still works); everything else runs. The demo path needs no external services.

Open the app at `http://localhost:3000` and create the first user from the
login screen. Load example data to explore with content:

```bash
yarn seed     # imports example products and customers from examples/import/
```

People who only want to run the ready app image can use the Docker quick start
in the docs. It uses the public GHCR image `ghcr.io/solivio-ai/solivio-app`,
which applies committed migrations on startup.

Useful commands:

```bash
yarn check                       # Biome lint + format check
yarn biome check --write .       # auto-fix lint + format (run after every change)
yarn typecheck
yarn e2e
yarn docs:dev
yarn db:migrate
yarn db:down
```

Run `yarn biome check --write .` before committing — it sorts imports, normalises
formatting, and applies safe lint fixes so `yarn check` stays green in CI.

## 🧪 End-to-End Tests

Playwright tests live in `e2e/` and use the same local app path as source
development. Run the regular setup first:

```bash
yarn setup
yarn e2e
```

`yarn e2e` starts `yarn dev` on `http://localhost:3000` if the app is not
already running. Set `PLAYWRIGHT_BASE_URL` only when you want to point the same
tests at an already-running app URL. If Playwright browsers are missing, run
`yarn playwright install chromium` once.

Docs:

- Getting started: `apps/docs/src/content/docs/guides/getting-started.md`
- Deployment: `apps/docs/src/content/docs/guides/deployment.md`
- Feature walkthrough: `apps/docs/src/content/docs/guides/features.md`

## 📊 Agent Benchmarks

A measurable benchmark suite for Solivio's AI agents lives in
[`apps/solivio/benchmarks/`](apps/solivio/benchmarks/README.md) — 12 scenario
cases (basic → expert) scored deterministically against a fixed product
catalog, with committed results and per-run history. Use it to track agent
quality over time and compare models:

```bash
yarn benchmark            # run the suite (writes a .json result)
yarn benchmark:report     # render markdown + refresh the latest-results summary
```

See [`apps/solivio/benchmarks/README.md`](apps/solivio/benchmarks/README.md)
for scoring rules, case catalog, and the latest results.

## 🤝 Contributing

Contributions should keep the default demo path simple, documented, and runnable without mandatory external services.

When adding new functionality:

- preserve the frontend, API, and server separation
- keep AI and database integrations behind server helpers and API routes
- prefer a working mock over an unfinished integration
- document any new setup or environment requirements

If you want to help shape Solivio, contributions are welcome in product thinking, workflow design, quoting use cases, and implementation details.

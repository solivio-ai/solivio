<p align="center">
  <img src="./solivio-logo.png" alt="Solivio" width="360" />
</p>

<p align="center">
  <strong>Quotes shouldn't take hours. They should start from your data.</strong>
  <br />
  </p>

Solivio is an open-source product created by Derave Software.

It combines an implementation process with an open-source software foundation built for companies where product catalogs contain thousands of items and offers often include dozens of line items.

Solivio helps sales teams move from manual quoting to data-driven quoting. Instead of rebuilding every offer from scratch, it uses AI and company knowledge to prepare a draft offer that a salesperson reviews, adjusts, validates, and moves further through the organization.

## 💡 What Solivio Is

Solivio is designed for companies where quoting is too complex, too manual, and too dependent on individual experience.

It is especially relevant when the business operates with:

- 📦 large product catalogs
- 🧩 many configurable or multi-line offers
- 🧠 data scattered across ERP, CRM, price lists, documents, and people's heads
- ✅ approval-heavy processes
- ⏳ long onboarding time for new salespeople

The goal is not to replace the salesperson. The goal is to reduce repetitive operational work, standardize quoting, and help the team respond faster with more consistency.

Solivio is also meant to support consultative selling. It should connect many data points and help teams build the best possible offer, not only the fastest one.

## 🚨 Why Solivio Exists

In many organizations, quoting is still a fragmented process:

- 🧑‍💼 senior salespeople spend time on operational work instead of selling
- 🌱 junior salespeople need months to become effective
- 📝 every offer is built slightly differently
- 🚦 approvals, pricing, and product knowledge create bottlenecks
- 🔗 ERP, CRM, Excel, price lists, and internal know-how do not work as one system

The result is slow response time, inconsistent quality, onboarding friction, and limited ability to scale sales operations.

Solivio exists to solve that operational gap.

## 🛠️ How Solivio Works

Solivio shortens the quoting process through an AI-assisted workflow:

1. 📥 A customer sends an inquiry.
2. 🔎 Solivio reads the inquiry together with connected business data.
3. 🧠 The system extracts requirements, searches for matching products, and prepares recommendations.
4. 🧾 Solivio generates a draft offer.
5. 👤 A salesperson reviews, edits, validates, and accepts it.
6. 🚀 The accepted draft moves into downstream steps defined during implementation, such as ERP sync or final PDF generation.

Each implementation starts with mapping the real quoting process inside the client organization. What happens after the draft is generated depends on that mapped workflow.

## 🔥 Business Problems Solivio Solves

Solivio focuses on the bottlenecks that make quoting difficult to scale:

1. ⏳ Onboarding slows down growth. New salespeople need months to become effective, so team expansion takes too long.
2. 💸 Senior salespeople are trapped in operations. Top performers spend time building offers and supporting juniors instead of generating revenue.
3. 📏 Offer quality depends on the person, not the process. Juniors work slower, seniors work faster, and consistency suffers.
4. 📈 Quoting does not scale with demand. Every additional inquiry creates more manual work and more chaos.
5. 🔌 Data is fragmented across systems. ERP, CRM, Excel, price lists, and internal know-how require repeated copy-paste work.

## 📈 What Business Outcome It Aims For

Solivio is meant to help companies:

- ⚡ shorten quote turnaround time
- 🧹 reduce manual operational work
- 📏 standardize offer quality across the team
- 🧑‍🏫 make onboarding less dependent on senior employees
- 🚀 improve sales capacity without growing chaos
- 🔁 create a more scalable quoting process

## 🔮 Product Direction

Solivio aims to become the layer between customer inquiry and final offer by providing:

- 🤖 automatic draft offer generation based on data
- 🔗 CRM, ERP, and price-list integration
- 🧩 support for configurable products and bundles
- ✅ approval-aware workflows such as discount acceptance
- 📍 a central source of truth about product and customer context
- 🚀 faster onboarding for salespeople
- 📬 support for multiple channels such as email, phone, and partner or account-based workflows

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
cp apps/solivio/.env.example apps/solivio/.env.local   # set BETTER_AUTH_SECRET
yarn setup
yarn dev
```

Open the app at `http://localhost:3000` and create the first user from the
login screen.

People who only want to run the ready app image can use the Docker quick start
in the docs. It uses the public GHCR image `ghcr.io/solivio-ai/solivio-app`,
which applies committed migrations on startup.

Useful commands:

```bash
yarn typecheck
yarn docs:dev
yarn db:migrate
yarn db:down
```

Docs:

- Getting started: `apps/docs/src/content/docs/guides/getting-started.md`
- Deployment: `apps/docs/src/content/docs/guides/deployment.md`
- Feature walkthrough: `apps/docs/src/content/docs/guides/features.md`

## 🤝 Contributing

Contributions should keep the default demo path simple, documented, and runnable without mandatory external services.

When adding new functionality:

- preserve the frontend, API, and server separation
- keep AI and database integrations behind server helpers and API routes
- prefer a working mock over an unfinished integration
- document any new setup or environment requirements

If you want to help shape Solivio, contributions are welcome in product thinking, workflow design, quoting use cases, and implementation details.

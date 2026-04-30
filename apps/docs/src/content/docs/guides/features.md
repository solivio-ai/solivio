---
title: Feature walkthrough
description: First steps inside Solivio after the app is running.
---

This chapter walks through the current product path: import a catalog, generate
a draft offer, review it, and accept it.

## 1. Sign in

Open the app and create a user from the login screen. Local and first-time
deployment environments usually keep `AUTH_SIGNUP_ENABLED=true` so the first
account can be created from the browser.

For shared environments, set `AUTH_SIGNUP_ENABLED=false` after initial users
exist.

## 2. Import a product catalog

Open **Catalog Upload** at `/products/upload`.

Upload a CSV file with these columns:

```text
sku,name,description,manufacturer
```

Comma, semicolon, and tab-separated files are accepted. The importer previews
the parsed rows before saving them. The current importer does not map price
columns; imported products default to zero price until pricing rules or ERP data
are added for a specific implementation.

When you click **Embed and save**, Solivio:

- sends product text to the selected OpenAI embedding model,
- stores products in Postgres,
- stores a combined vector embedding for semantic search,
- updates existing products when the same `sku` is imported again.

Catalog import requires `OPENAI_API_KEY`.

## 3. Generate a draft offer

Open **New Offer** at `/offers/new`.

Enter a customer name and paste the raw customer request. The offer generation
agent:

- extracts distinct requested product lines and quantities,
- decides whether each fragment looks like an exact SKU or a product description,
- searches the catalog with exact SKU lookup or semantic vector search,
- creates a draft offer with matched items, unmatched request fragments, and notes.

Offer generation requires both a populated product catalog and `OPENAI_API_KEY`.

## 4. Review the draft

The offer review screen is where a salesperson checks the generated draft before
accepting it.

Use it to:

- change quantities,
- add products from catalog search,
- remove incorrect products,
- review unmatched request items,
- adjust the offer discount,
- check margin, pricing, availability, and acceptance status.

Changes are saved through server API routes and persisted in Postgres. The
offer discount is stored on the offer itself, so it survives reloads, is
included in revision snapshots, and is rendered as a separate line in the
generated PDF.

## 5. Use product search and quick offers

The dashboard has a **Find a product** entry point. It opens catalog search,
lets you select quantities, and creates a draft offer directly from selected
products.

Inside an existing draft, **Add product** opens the same catalog search dialog
and saves selected products onto the current offer.

## 6. Ask the offer assistant

The assistant panel appears next to the offer review screen. It uses the current
offer as context and can help with questions such as:

- summarizing the customer request,
- explaining why products were selected,
- identifying missing information,
- suggesting upsell products from the catalog,
- adding products,
- changing quantities,
- removing line items.

The assistant uses the catalog and offer-editing tools exposed by the server, so
it should not invent products that are not found in the catalog. Offer chat
requires `OPENAI_API_KEY`.

## 7. Accept and download

Click **Accept draft** when the draft is ready. The accepted view renders a PDF
preview and provides a download action.

Use **Back to draft** when another review pass is needed.

## What is still implementation-specific

Solivio is intentionally kept as a practical starting point. The current app
provides the local quoting workflow and the server boundaries for catalog,
offer, PDF, auth, and AI features. Production implementations usually still need
company-specific work around:

- catalog field mapping and price rules,
- ERP or CRM synchronization,
- approval workflow,
- final offer document design,
- user provisioning and SSO,
- observability and backups.

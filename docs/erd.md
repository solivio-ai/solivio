# Database Schema — Offering

Scope: quoting domain (customers, products, requests, offers, items, revisions, chat)

This document is the canonical ERD for the offering pipeline. Stack-level details (Docker image, pgvector version) live in `database.md`. Lifecycle and architecture context lives in `architecture.md`.

## Diagram

```mermaid
erDiagram
    customers ||--o{ offers : "has"
    customers ||--o{ customers_requests : "submits"
    customers_requests ||--o{ offers : "converts to"
    users ||--o{ offers : "owns"

    offers ||--o{ offers_items : "contains"
    offers ||--o{ offers_revisions : "snapshots"
    offers ||--o{ offer_chat_threads : "discussion"

    offer_chat_threads ||--o{ offer_chat_messages : "messages"

    catalog_products ||--o{ offers_items : "matched as"
    catalog_products ||--o{ catalog_product_prices : "priced as"

    customers {
        uuid id PK
        text name
        text source
        timestamptz created_at
        timestamptz updated_at
    }

    users {
        text id PK
        text name
        text email
        timestamptz created_at
        timestamptz updated_at
    }

    customers_requests {
        uuid id PK
        uuid customer_id FK "nullable"
        text raw_text
        text source
        timestamptz created_at
        timestamptz updated_at
    }

    offers {
        uuid id PK
        uuid customer_id FK "nullable"
        uuid request_id FK "nullable"
        text user_id FK "nullable"
        text name
        text status
        text currency
        numeric discount_percent
        numeric discount_amount
        text_array notes
        text_array unmatched
        timestamptz created_at
        timestamptz updated_at
    }

    offers_items {
        uuid id PK
        uuid offer_id FK
        uuid product_id FK "nullable"
        text name
        text description
        numeric quantity
        numeric unit_price_net
        numeric vat_rate
        numeric unit_gross_price
        numeric total_net
        numeric total_gross
        text request_item
        text rationale
        text match_source
        numeric match_score
        int position
        timestamptz created_at
        timestamptz updated_at
    }

    offers_revisions {
        uuid id PK
        uuid offer_id FK
        int revision_number
        jsonb snapshot
        timestamptz accepted_at "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    offer_chat_threads {
        uuid id PK
        uuid offer_id FK
        text title
        timestamptz created_at
        timestamptz updated_at
    }

    offer_chat_messages {
        text id PK
        uuid thread_id FK
        text role "user|assistant|system|tool"
        jsonb parts
        timestamptz created_at
        timestamptz updated_at
    }

    catalog_products {
        uuid id PK
        text sku
        text source
        text name
        text description
        halfvec embedding "3072 dim"
        timestamptz created_at
        timestamptz updated_at
    }

    catalog_product_prices {
        uuid id PK
        uuid product_id FK
        text currency
        numeric net
        numeric gross
        numeric vat_rate
        text source
        timestamptz created_at
        timestamptz updated_at
    }
```

## Notes

### Naming convention
All domain tables are plural. The Better Auth table conventionally named `user` is renamed to `users` in this schema to stay consistent.

### `match_source` values
- `exact` — SKU match
- `semantic` — pgvector top-1 (LLM rerank lives in the same pipeline path)
- `manual` — added by salesperson via UI / chat

### `match_score`
- `exact` → `1.0`
- `semantic` → cosine similarity of the picked candidate
- `manual` → `null`

### Computed totals (`offers_items`)
Computed in the application service layer on write, persisted as plain numeric columns:
- `unit_gross_price = unit_price_net * (1 + vat_rate / 100)`
- `total_net = quantity * unit_price_net`
- `total_gross = quantity * unit_price_net * (1 + vat_rate / 100)`

### Currency
`offers.currency` is authoritative for the whole offer. All items inherit it. `offers_items` does not carry a `currency` column.

### Discount
`offers.discount_percent` and `offers.discount_amount` are mutually exclusive at the service layer: only one of them is non-zero per offer. The other column stores `0`.

### `offer_chat_messages.parts`
Array of typed message parts: `text`, `tool-call`, `tool-result`, `reasoning`, `file`, `source`. Persisted as `jsonb` to keep the chat agent message shape verbatim across turns.

### `users`
Renamed Better Auth table. The full auth schema also includes `sessions`, `accounts`, `verifications` — omitted from this diagram as they are auth infrastructure, not offering domain.

### Status values (`offers.status`)
Initial set: `draft`, `accepted`, `rejected`.

### Nullability
- `customers_requests.customer_id` — nullable (request may arrive before customer match)
- `offers.customer_id` — nullable (draft can exist before customer is set)
- `offers.request_id` — nullable (offer may be created without a tracked request)
- `offers.user_id` — nullable (system-created offers without a salesperson owner)
- `offers_items.product_id` — nullable (custom items without catalog product)
- `offers_revisions.accepted_at` — non-null on the locked accepted revision only

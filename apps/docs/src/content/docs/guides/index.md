---
title: Guides
description: Guides for the Solivio open-source sales offer workflow.
---

Solivio is an open-source foundation for a sales workflow that converts raw
customer input into a reviewed product offer.

The guides are Markdown files in this workspace. API reference pages are kept in
the separate API tab and generated from route contracts exported by the Next.js
API implementation.

## Product flow

1. Customer sends a request.
2. Solivio extracts requirements.
3. Product search and matching finds candidates.
4. A draft offer is generated.
5. A salesperson reviews, edits, validates, and accepts it.

## Documentation sources

- Human-authored guides: `apps/docs/src/content/docs/guides`
- API route contracts: `apps/solivio/src/server/api/contracts.ts`
- Generated OpenAPI output: `apps/docs/public/openapi/solivio.json`
- Generated API reference pages: `/api/`

The generated OpenAPI file is not the source of truth. Regenerate it from the
route contracts before building or publishing the docs.

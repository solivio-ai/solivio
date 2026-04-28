---
title: Guides
description: Guides for Solivio, an open-source AI system that transforms how B2B companies create offers.
---

Solivio is an open-source AI system that transforms how B2B companies create
offers.

Instead of building every quote manually, Solivio generates structured offer
drafts based on your data — in seconds.

The guides are Markdown files in this workspace. API reference pages are kept in
the separate API tab and generated from route contracts exported by the Next.js
API implementation.

## The shift

From:
Manual work → Searching → Copy-paste → Guessing

To:
Data → AI → Structured draft → Review → Send

## Documentation sources

- Human-authored guides: `apps/docs/src/content/docs/guides`
- Brand guide: `apps/docs/src/content/docs/guides/brand.md`
- API route contracts: `apps/solivio/src/server/api/contracts.ts`
- Generated OpenAPI output: `apps/docs/public/openapi/solivio.json`
- Generated API reference pages: `/api/`

The generated OpenAPI file is not the source of truth. Regenerate it from the
route contracts before building or publishing the docs.

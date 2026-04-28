---
title: Publishing
description: Publish Solivio docs as a standalone static site.
---

The docs are publishable separately from the Next.js app. They are a static
Astro Starlight site in `apps/docs`, with Markdown-authored guides and generated
OpenAPI reference pages.

## Build

```bash
npm run docs:build
```

The docs build runs `openapi:generate` first, then emits static files to:

```text
apps/docs/dist
```

Publish that directory to GitHub Pages, Netlify, Vercel, Cloudflare Pages, or
any static host.

## Recommended release check

Before publishing public docs, run:

```bash
npm run openapi:generate
npx @redocly/cli@latest lint apps/docs/public/openapi/solivio.json
npm run docs:build
```

Use a Node 22.12+ CI image for Redocly CLI because current Redocly releases
require a newer Node patch than the minimum app runtime.

## Why this setup

- Docs are independent from the demo app deployment.
- Guides stay as Markdown in the public repository.
- API reference pages are generated from the OpenAPI file.
- The OpenAPI file is generated from the same Zod contracts used by route
  handlers.
- The default app path still has no required external service.

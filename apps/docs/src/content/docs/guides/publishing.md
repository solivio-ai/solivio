---
title: Publishing
description: Publish Solivio docs as a standalone static site.
---

The docs are publishable separately from the Next.js app. They are a static
Astro Starlight site in `apps/docs`, with Markdown-authored guides and generated
OpenAPI reference pages.

## Build

```bash
yarn docs:build
```

The docs build runs `openapi:generate` first, then emits static files to:

```text
apps/docs/dist
```

The repository includes a GitHub Actions workflow that deploys this directory to
GitHub Pages for `https://solivio.ai` on pushes to `main`.

For other hosts, publish `apps/docs/dist` to Netlify, Vercel, Cloudflare Pages,
or any static host.

## GitHub Pages

The workflow is `.github/workflows/docs-pages.yml`. It installs dependencies
with `yarn install --immutable`, runs `yarn docs:build`, uploads
`apps/docs/dist`, and deploys through GitHub Pages.

Repository setup still needs to be enabled once in GitHub:

1. Open `Settings -> Pages` for `solivio-ai/solivio`.
2. Set the build and deployment source to `GitHub Actions`.
3. Set the custom domain to `solivio.ai`.
4. Enable HTTPS after GitHub provisions the certificate.

Configure DNS for the apex domain with GitHub Pages `A` records:

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

For `www.solivio.ai`, create a `CNAME` record pointing to
`solivio-ai.github.io`.

## Recommended release check

Before publishing public docs, run:

```bash
yarn openapi:generate
yarn dlx @redocly/cli@latest lint apps/docs/public/openapi/solivio.json
yarn docs:build
```

Use a Node 24.15+ CI image for Redocly CLI and the docs build.

## Why this setup

- Docs are independent from the demo app deployment.
- Guides stay as Markdown in the public repository.
- API reference pages are generated from the OpenAPI file.
- The OpenAPI file is generated from the same Zod contracts used by route
  handlers.
- The default app path still has no required external service.

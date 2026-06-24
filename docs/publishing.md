# Publishing Docs

Solivio docs are publishable separately from the Next.js app. The docs site lives
in `apps/docs`, uses Astro Starlight, and writes human-authored pages in
Markdown under `apps/docs/src/content/docs/guides`. The site root is a landing
page, guides live under `/guides`, and generated API reference pages live under
`/api`.

## Cloudflare Workers Deployment

Docs are hosted through Cloudflare Workers Builds connected to GitHub. Pushes to
`main` deploy production, and each pull request gets a docs preview environment
that updates as commits are pushed.

The docs site is configured with `site: "https://solivio.ai"` in
`apps/docs/astro.config.mjs`.

The root docs build runs module wiring first and then the docs workspace runs
OpenAPI generation. Keep the Cloudflare build pointed at the repository root,
running `yarn docs:build`, with `apps/docs/dist` served as the static asset
output.

## DNS For solivio.ai

Production docs are served from `solivio.ai`. Preview environments use
Cloudflare-generated Worker preview URLs and do not need custom DNS.

## Manual Static Deployment

For any other static host:

1. Install from the repository root with `yarn install`.
2. Build the docs from the repository root with `yarn docs:build`.
3. Publish `apps/docs/dist`.

## API Contract

Use `apps/solivio/src/server/api/contracts.ts` as the source of truth. The
generated schema is written to `apps/docs/public/openapi/solivio.json` during the
docs build and is consumed by the Starlight OpenAPI plugin.

Before a public release, lint the generated file on a Node 24.15+ CI image:

```bash
yarn openapi:generate
yarn dlx @redocly/cli@latest lint apps/docs/public/openapi/solivio.json
```

## Publishing Targets

The output is static HTML, CSS, JavaScript, and search assets. Suitable targets
include Cloudflare Workers static assets, Cloudflare Pages, Netlify, Vercel, and
any plain static host.

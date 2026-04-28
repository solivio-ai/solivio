# Publishing Docs

Solivio docs are publishable separately from the Next.js app. The docs site lives
in `apps/docs`, uses Astro Starlight, and writes human-authored pages in
Markdown.

## Recommended Deployment

1. Install from the repository root with `npm install`.
2. Generate the API contract with `npm run openapi:generate`.
3. Build the docs workspace with `npm run docs:build`.
4. Publish `apps/docs/dist` to any static host.

The docs build runs OpenAPI generation first, so publishing can usually just run
`npm run docs:build`.

## API Contract

Use `apps/solivio/src/server/api/contracts.ts` as the source of truth. The
generated schema is written to `apps/docs/public/openapi/solivio.json` during the
docs build and is consumed by the Starlight OpenAPI plugin.

Before a public release, lint the generated file on a Node 22.12+ CI image:

```bash
npm run openapi:generate
npx @redocly/cli@latest lint apps/docs/public/openapi/solivio.json
```

## Publishing Targets

The output is static HTML, CSS, JavaScript, and search assets. Suitable targets
include GitHub Pages, Netlify, Vercel, Cloudflare Pages, and any plain static
host.

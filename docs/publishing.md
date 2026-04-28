# Publishing Docs

Solivio docs are publishable separately from the Next.js app. The docs site lives
in `apps/docs`, uses Astro Starlight, and writes human-authored pages in
Markdown under `apps/docs/src/content/docs/guides`. The site root is a landing
page, guides live under `/guides`, and generated API reference pages live under
`/api`.

## GitHub Pages Deployment

The repository includes `.github/workflows/docs-pages.yml`. On every push to
`main` that changes docs, API contracts, package metadata, or the workflow
itself, GitHub Actions builds `apps/docs` and deploys `apps/docs/dist` to GitHub
Pages.

The docs site is configured with `site: "https://solivio.ai"` in
`apps/docs/astro.config.mjs`. The docs public folder also includes:

- `CNAME`, containing `solivio.ai`.
- `.nojekyll`, so GitHub Pages serves Astro assets such as `/_astro`.

Repository setup still needs to be enabled once in GitHub:

1. Open `Settings -> Pages` for `solivio-ai/solivio`.
2. Set the build and deployment source to `GitHub Actions`.
3. Set the custom domain to `solivio.ai`.
4. Enable HTTPS after GitHub provisions the certificate.

The docs build runs OpenAPI generation first, so the workflow only needs
`yarn install --immutable` and `yarn docs:build`.

## DNS For solivio.ai

Configure the apex domain with the GitHub Pages `A` records:

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Optional IPv6 records:

```text
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

For `www.solivio.ai`, create a `CNAME` record pointing to:

```text
solivio-ai.github.io
```

Avoid wildcard records for `*.solivio.ai`.

## Manual Static Deployment

For any other static host:

1. Install from the repository root with `yarn install`.
2. Generate the API contract with `yarn openapi:generate`.
3. Build the docs workspace with `yarn docs:build`.
4. Publish `apps/docs/dist`.

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
include GitHub Pages, Netlify, Vercel, Cloudflare Pages, and any plain static
host.

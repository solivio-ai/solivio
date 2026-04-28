---
title: Brand
description: Solivio brand assets, theme tokens, and public copy rules.
---

Solivio uses a dark-first interface with a yellow primary action color and teal
secondary surfaces. Public pages, app metadata, and docs should use copy from
the repository README.

## Assets

- Repository logo: `solivio-logo.png`
- App/docs headers: use the existing PNG logo or a plain text lockup.
- Avoid generated logo artwork in public surfaces unless it comes from a reviewed source file.

## Theme

```css
:root {
  --solivio-color-background: #020617;
  --solivio-color-foreground: #fafafa;
  --solivio-color-card: #0f172a;
  --solivio-color-primary: #facc15;
  --solivio-color-primary-foreground: #020617;
  --solivio-color-secondary: #134e4a;
  --solivio-color-muted: #1e293b;
  --solivio-color-muted-foreground: #a1a1aa;
  --solivio-radius: 0.5rem;
}
```

The canonical token set lives in `packages/theme/src/tokens.css`. The Next app
maps those tokens to shadcn/Tailwind variables in
`apps/solivio/src/app/globals.css`, while docs map the same tokens to Starlight
variables in `apps/docs/src/styles/solivio.css`.

## Copy

- Primary line: Quotes shouldn’t take hours. They should start from your data.
- Product description: Solivio is an open-source AI system that transforms how
  B2B companies create offers.
- Supporting line: Instead of building every quote manually, Solivio generates
  structured offer drafts based on your data — in seconds.
- Flow: Data → AI → Structured draft → Review → Send.

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
@theme {
  --color-background: #020617;
  --color-foreground: #fafafa;
  --color-card: #0f172a;
  --color-primary: #facc15;
  --color-primary-foreground: #020617;
  --color-secondary: #134e4a;
  --color-muted: #1e293b;
  --color-muted-foreground: #a1a1aa;
  --color-ring: #facc15;
}
```

The full token set lives in `apps/solivio/src/app/globals.css`. Docs mirror the
same palette in `apps/docs/src/styles/solivio.css`.

## Copy

- Primary line: Quotes shouldn’t take hours. They should start from your data.
- Product description: Solivio is an open-source AI system that transforms how
  B2B companies create offers.
- Supporting line: Instead of building every quote manually, Solivio generates
  structured offer drafts based on your data — in seconds.
- Flow: Data → AI → Structured draft → Review → Send.

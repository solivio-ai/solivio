## What & why

<!-- One or two sentences. Link the issue if there is one. -->

## Checklist

- [ ] `yarn validate` passes (biome + boundaries + generate --check + typecheck + Vitest)
- [ ] `yarn db:check` passes (run `yarn setup` first) — required when schemas/migrations changed
- [ ] `yarn e2e` passes locally
- [ ] Feature code lives in a module (`modules/<id>/`), not in `apps/solivio` (see `docs/module-system.md`)
- [ ] New env vars documented in `apps/solivio/.env.example`
- [ ] Docs updated if behavior, commands, or contracts changed (`CONTRIBUTING.md` / `docs/` / `AGENTS.md` stay aligned)

> Changes to `scripts/generate/`, the public `@solivio/sdk` surface, or boundary rules need prior discussion (see CONTRIBUTING.md "Ask first").

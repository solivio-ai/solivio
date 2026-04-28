# MVP Scope

This document turns the process board into implementation slices.

## Foundation

- Repository README and setup docs
- Next.js frontend and API apps
- Docker Compose with Postgres and pgvector
- Shared domain models
- Basic mocked demo path

## Product Data

- Product input/import path
- Product CRUD
- Product availability state
- Embedding generation for product search
- Search endpoint with filters and semantic ranking

## Customer Request

- Manual request input
- Chat-based intake
- Requirement extraction
- Customer information mock, then persistence
- Request history

## Offer Generation

- Product matching
- Draft offer generation
- Alternative product suggestions
- Offer output view
- Offer list

## Sales Review

- Editable offer draft
- Change diff
- Final validation with rule checks and AI support
- Accept/reject flow
- PostHog events for funnel analysis

## Later Platform Work

- Auth and SSO
- Deployment environment
- API documentation
- Observability
- Public contribution guide

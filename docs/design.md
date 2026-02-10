---
type: "design"
project: "Work Management"
version: "0.1"
status: "draft"
created: "2026-02-10"
updated: "2026-02-10"
brief_ref: "./discover-brief.md"
intent_ref: "./intent.md"
---

# Design: Work Management

## Summary

Technical design for the Work Management system — a central system of record for all work across projects, accessible to agents (via MCP/API) and humans (via dashboard). This design transforms the approved Brief (v0.4) into implementation-ready specifications for a Next.js application backed by Supabase, deployed on Vercel.

**Classification:** App / personal / mvp / multi-component

## Document Map

This design exceeds the 500-line threshold and is split into focused sub-documents:

| Document | Purpose | Read When |
|----------|---------|-----------|
| [design-architecture.md](./design-architecture.md) | System architecture, tech stack, deployment, auth, security | Understanding how components connect |
| [design-data-model.md](./design-data-model.md) | Supabase schema, migrations, indexes, RLS, computed fields | Working on database or API layer |
| [design-interface.md](./design-interface.md) | REST API contracts, MCP tool definitions, dashboard views | Building API, MCP adapter, or dashboard |

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Database | Supabase (Postgres) | Existing project, built-in auth, DB management UI |
| Auth | Supabase Auth (JWT) | Single-user MVP, zero custom auth code |
| API | Next.js Route Handlers | Collocated with dashboard, TypeScript, serverless |
| Dashboard | React / Next.js App Router | Modern React, server components, file-based routing |
| Hosting | Vercel | Purpose-built for Next.js, zero-config, free tier |
| MCP Adapter | TypeScript MCP server (stdio) | Local process, thin REST wrapper |
| ADF Connector | Module within MCP server | Markdown parser + sync_project tool |

## Capabilities

### Runtime Dependencies

- Node.js 20+
- TypeScript 5+
- Next.js 15 (App Router)
- @supabase/supabase-js
- @supabase/ssr (server-side auth)
- Tailwind CSS 4
- @modelcontextprotocol/sdk

### External Services

- Supabase project `fxidgnsjhjdaunzzbxpe`
- Vercel (deployment)

### Development Tools

- Supabase CLI (migrations, local dev)
- Vercel CLI (deployment)
- pnpm (package manager)

## Decision Log

Decisions from Discover stage and Design intake, carried forward as the authoritative record.

| # | Decision | Options Considered | Chosen | Rationale | Date |
|---|----------|-------------------|--------|-----------|------|
| 1 | Plan as first-class entity | Implicit in structure vs explicit entity | Explicit entity | Plans have own lifecycle, represent commitment boundary | 2026-02-10 |
| 2 | Validation separate from status | Status only vs separate dimension | Separate validation_status + outcome | "Done" ≠ "validated" — need orthogonal tracking | 2026-02-10 |
| 3 | Backlog multi-stage lifecycle | Simple status vs multi-stage | captured → triaged → prioritized → promoted/archived | Reflects real workflow from capture to action | 2026-02-10 |
| 4 | Work Manager agent out of MVP | Include vs defer | Defer | Start with infrastructure, layer intelligence later | 2026-02-10 |
| 5 | Inbound-only sync | Bidirectional vs inbound | Inbound-only | Simplifies MVP, source systems own their data | 2026-02-10 |
| 6 | Supabase project | New vs existing | Existing: fxidgnsjhjdaunzzbxpe | Already provisioned, avoids setup | 2026-02-10 |
| 7 | Database | Postgres only vs multi-DB | Postgres only | All needs covered: relational, JSONB, arrays, FTS | 2026-02-10 |
| 8 | App hosting | Vercel vs Railway | Vercel | Purpose-built for Next.js, best DX, free tier | 2026-02-10 |
| 9 | Auth approach | Supabase Auth vs API keys vs custom JWT | Supabase Auth with JWT | Solves single-user auth with zero custom code | 2026-02-10 |
| 10 | ActivityLog capture | API-level vs DB triggers | API-level middleware | Actor context available, all mutations go through API | 2026-02-10 |
| 11 | Health computation | Query-time vs stored + cached | Query-time, worst-signal-wins | Always fresh, no sync issues | 2026-02-10 |
| 12 | source_id handling | Optional vs required for synced | Required for synced (API-enforced), null for native | Enables idempotent sync matching | 2026-02-10 |
| 13 | ADF sync trigger | CLI script vs hook vs MCP tool | WM MCP server sync_project() tool | WM owns connectors, any MCP client can trigger | 2026-02-10 |
| 14 | Task display ID | UUID only vs human-readable | Sequential #N per project, UUID stays as PK | Dashboard usability, minimal effort | 2026-02-10 |
| 15 | Project naming | Rename vs keep | Keep "Work Management" for MVP | Functional, clear, low-cost to rename later | 2026-02-10 |

## Backlog

Items explicitly deferred from MVP, documented for future consideration.

| # | Item | Origin | Notes |
|---|------|--------|-------|
| 1 | Work Manager agent | Brief | Intelligence layer — post-MVP when KB/Krypton ready |
| 2 | Bidirectional sync | Brief | Write-back to connected systems |
| 3 | Additional connectors (Linear, GitHub, Notion) | Brief | After ADF connector validated |
| 4 | Multi-user access / permissions | Brief | Designed for but not implemented |
| 5 | Command bar | Brief | Keyboard-driven navigation |
| 6 | Mobile responsiveness | Brief | Desktop-primary for MVP |
| 7 | Custom view builder | Brief | Fixed views for MVP |
| 8 | Digest engine | Brief | Post-MVP, needs Krypton for delivery |
| 9 | Real-time collaboration | Brief | Single-user MVP |
| 10 | Stored health cache | Design intake | Query-time sufficient for MVP scale |

## Open Questions

_None — all questions resolved during Discover review and Design intake._

## Issue Log

| # | Issue | Source | Severity | Status | Resolution |
|---|-------|--------|----------|--------|------------|
| — | No issues yet | — | — | — | — |

## Develop Handoff

_To be completed at Design finalization._

## Review Log

_To be populated during review phase._

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-02-10 | Initial draft — parent design doc with tech stack, decisions, capabilities |

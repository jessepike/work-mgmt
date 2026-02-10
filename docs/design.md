---
type: "design"
project: "Work Management"
version: "0.3"
status: "internal-review-complete"
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
| 1 | Circular FK: project.connector_id ↔ connector.project_id — migration ordering conflict and redundant relationship | Ralph-Design | High | Resolved | Removed connector_id from project table. Connector lookup via connector.project_id (1:1). |
| 2 | MCP adapter missing Plan and Phase tools — contradicts stated 1:1 REST mapping | Ralph-Design | High | Resolved | Added Plan and Phase CRUD tools to MCP adapter table. |
| 3 | One-active-plan-per-project constraint not enforced — Brief requires it, no schema or API validation | Ralph-Design | High | Resolved | Added API validation rule: reject plan creation when project already has non-completed plan. |
| 4 | Full-text search approach unspecified — /api/search references Postgres FTS but no tsvector/GIN index defined | Ralph-Design | High | Resolved | Added FTS section to data model: generated tsvector column + GIN index on task and backlog_item. |
| 5 | updated_at auto-update mechanism unspecified | Ralph-Design | Low | Open | Recommend DB trigger for consistency. Implementation detail for Develop. |
| 6 | entity_type in activity_log is text, Brief defines as enum | Ralph-Design | Low | Open | Text is more flexible; acceptable deviation. |
| 7 | project.current_phase_id missing FK to phase table | Ralph-Design | Low | Resolved | Added REFERENCES phase(id) constraint. |
| 8 | GET /api/projects/:id response missing connector info — dashboard needs sync status | Ralph-Design | High | Resolved | Added connector info (connector_id, type, status, last_sync_at) to project detail response. |
| 9 | No MCP tools for connector management (list, create) | Ralph-Design | Low | Open | MVP connectors set up via seed/dashboard. Acceptable for MVP scope. |

## Develop Handoff

_To be completed at Design finalization._

## Review Log

### Phase 1: Internal Review (Ralph Loop)

**Cycle 1 — 2026-02-10**
**Issues Found:** 0 Critical, 4 High, 3 Low
**Actions Taken:**
- **#1 (High):** Removed `connector_id` from project table — circular FK with connector.project_id. Connector lookup via `connector.project_id`.
- **#2 (High):** Added Plan and Phase CRUD tools to MCP adapter — was contradicting stated 1:1 REST mapping.
- **#3 (High):** Added one-active-plan validation rule — reject plan creation when non-completed plan exists (409).
- **#4 (High):** Added Full-Text Search section to data model — generated tsvector columns + GIN indexes on task and backlog_item.
- **#7 (Low):** Added FK constraint on `project.current_phase_id → phase(id)`, deferred in migration ordering.
**Outcome:** All High issues resolved. Proceeding to Cycle 2.

**Cycle 2 — 2026-02-10**
**Issues Found:** 0 Critical, 1 High, 1 Low
**Actions Taken:**
- **#8 (High):** Added connector info to GET /api/projects/:id response — needed for dashboard sync status indicator.
**Outcome:** High issue resolved. Proceeding to Cycle 3.

**Cycle 3 — 2026-02-10**
**Issues Found:** 0 Critical, 0 High, 0 Low
**Outcome:** Stop conditions met. Internal review complete.

**Internal Review Summary:**
- **Cycles:** 3
- **Total Issues:** 5 High, 4 Low
- **Resolved:** 5 High, 2 Low
- **Open (Low):** 2 (#5 updated_at mechanism, #9 connector MCP tools)

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-02-10 | Initial draft — parent design doc with tech stack, decisions, capabilities |
| 0.2 | 2026-02-10 | Internal review cycle 1 — fixed circular FK (connector_id), added Plan/Phase MCP tools, added one-active-plan validation, added FTS indexing, fixed current_phase_id FK |
| 0.3 | 2026-02-10 | Internal review cycles 2-3 — added connector info to project detail API response. 3 cycles, 0 Critical/High remaining. Internal review complete. |

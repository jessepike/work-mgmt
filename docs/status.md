---
project: "work-management"
stage: "Develop"
updated: "2026-02-10"
---

# Status

## Current State

- **Phase:** Develop — implementation ready
- **Focus:** Design complete (v0.4). BACKLOG.md created with 31 items across 5 phases. Ready for Phase 1: Data Foundation.

## Design → Develop Handoff

### What Was Produced

- **design.md** (v0.4) — Parent design doc: tech stack, 15 decisions, capabilities, review logs
- **design-architecture.md** — System architecture, auth (Supabase Auth JWT, service role), request flows, project structure, error handling
- **design-data-model.md** — Full Supabase schema (8 tables, 12 enums), indexes, RLS, FTS (tsvector + GIN), display_id trigger, migration ordering (17 steps)
- **design-interface.md** — 25 REST endpoints, 20 MCP tools, 6 dashboard views, validation rules, component inventory
- **BACKLOG.md** — 31 prioritized implementation items across 5 phases

### Key Decisions

1. Supabase (existing project) + Vercel hosting
2. Supabase Auth with JWT, service role for server DB access
3. API-level activity logging (not DB triggers)
4. Query-time health computation (worst-signal-wins)
5. Sequential display IDs per project (DB trigger)
6. One-active-plan enforced at API + DB level

### Implementation Sequence

1. Data Foundation → 2. REST API → 3. MCP Adapter → 4. ADF Connector → 5. Dashboard

### Deferred to Develop (from review)

- Activity log atomicity for critical mutations (#13)
- current_phase_id cleanup on deletion (#14)
- connector.config JSONB schema (#15)

### Read Order for Develop

1. `intent.md` → 2. `discover-brief.md` → 3. `design.md` → 4. `design-architecture.md` → 5. `design-data-model.md` → 6. `design-interface.md` → 7. `BACKLOG.md`

---

## Discover → Design Handoff

### What Was Produced

- **intent.md** — North Star: central system of record for all work, agent-first + human-accessible
- **discover-brief.md** (v0.4) — Full project contract: entity model, API surface, data hierarchy, work lifecycle, dashboard views, ADF connector, implementation sequencing, success criteria
- **Design spec research** — Zed IDE visual language analysis, Todoist UX patterns, 2 rounds of Stitch prototyping (10 screens total), interaction model, component palette

### What Was Archived (docs/_archive/)

| Artifact | Rationale |
|----------|-----------|
| 2026-02-10-work-os-brief-v5.md | Input brief — superseded by discover-brief.md |
| 2026-02-10-stitch-prompt.md | Working artifact — design prompt for Stitch prototyping |
| 2026-02-10-discover-tasks.md | Empty Discover-stage task tracker — no longer needed |

### Deferred to Design (P2 from External Review)

- Auth approach for single-user MVP (brief Open Question)
- Health computation signal precision
- ActivityLog capture mechanism (API-level vs DB trigger)
- source_id handling for synced items
- Supabase free tier constraints + ActivityLog growth

### Pending Decisions (carried forward)

- Naming: "Work Management" is functional but generic
- Dashboard hosting: Vercel vs self-hosted
- Supabase project: new or reuse existing
- REST API auth approach for single-user MVP
- ADF sync trigger mechanism
- Task ID display format (UUID internal, human-readable display?)

### Read Order for Design Stage

1. `intent.md` — North Star
2. `discover-brief.md` — Full project contract
3. `status.md` — This file, for context and handoff

## Next Steps

- [x] Design stage planning — identify Design deliverables and approach
- [x] Resolve deferred P2 issues from Discover review
- [x] Resolve pending decisions (auth, hosting, Supabase, naming)
- [x] Technical design / architecture spec
- [x] Database schema design
- [x] API contract specification
- [x] Dashboard component design
- [x] Internal review (Ralph Loop) of design spec
- [x] External review of design spec
- [x] Finalization and Develop stage transition
- [ ] **Phase 1: Data Foundation** — scaffold, migrations, seed
- [ ] Phase 2: REST API — endpoints, validation, activity logging, health
- [ ] Phase 3: MCP Adapter — server, tools, Claude Desktop config
- [ ] Phase 4: ADF Connector — parser, sync_project tool
- [ ] Phase 5: Dashboard — views, components, auth, deploy

## Blockers

- None

## Session Log

| Date | Summary |
|------|---------|
| 2026-02-10 | Project initialized |
| 2026-02-10 | Exploration complete. Read architecture docs (TAXONOMY.md, AGENTIC-WORK-SYSTEM-ARCHITECTURE.md) and v5 brief. Aligned on: two-component model (store + agent), MVP scope (store + API + MCP + connector + dashboard), inbound-only sync, single user. Crystallized intent.md and discover-brief.md v0.1. |
| 2026-02-10 | Internal review (Ralph Loop): 2 cycles, 4 High issues resolved (digest scope, workflow_type, status/validation split, Plan usage rules). External review (Gemini/GPT/Kimi): 4 P1 resolved (API validation rules, sort_order, data origin enforcement, backlog promotion). 5 P2 deferred to Design. Brief at v0.4, ready for finalization. |
| 2026-02-10 | Design research: Zed IDE visual design language + Todoist UX patterns. Created Stitch design prompt. Generated 10 screens across 2 rounds. Completed design spec (7 screens, interaction model, component palette). |
| 2026-02-10 | **Discover → Design transition.** Archived working artifacts, updated handoff. All prerequisites met: intent clear, brief reviewed (internal + external), 0 Critical/High open. |
| 2026-02-10 | **Design Intake & Clarification.** Resolved all 10 open items: Supabase (existing project) + Vercel hosting, Supabase Auth (JWT), API-level activity logging, query-time health computation, source_id required for synced, WM MCP sync_project tool, sequential display IDs, keep "Work Management" name. 15 decisions logged. |
| 2026-02-10 | **Design spec v0.1 drafted.** 4 documents: design.md (parent), design-architecture.md (system components, auth, project structure), design-data-model.md (Supabase schema, indexes, RLS, triggers), design-interface.md (REST API contracts, MCP tools, dashboard views). Ready for review. |
| 2026-02-10 | **Internal review complete.** 3 cycles. 5 High issues resolved: circular FK (connector_id removed), Plan/Phase MCP tools added, one-active-plan constraint, FTS indexing, project detail connector info. 2 Low open. Design at v0.3. |
| 2026-02-10 | **External review complete.** Gemini + GPT (Kimi timed out). 3 High resolved: DB-level one-active-plan index, RLS/service role pattern clarified, pgcrypto extension added. 1 High dismissed (false positive). 3 Medium deferred. Design at v0.4. |
| 2026-02-10 | **Design → Develop transition.** Completed Develop Handoff, created BACKLOG.md (31 items, 5 phases), updated CLAUDE.md with stack/commands. All prerequisites met: design reviewed (8 High resolved, 0 open), BACKLOG ready, no blockers. |

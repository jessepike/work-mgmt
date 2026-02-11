---
project: "work-management"
stage: "Develop"
updated: "2026-02-11"
last_session: "2026-02-11T15:56"
---

# Status

## Current State

- **Phase:** Develop — Phases 1-5 complete (MVP scope)
- **Focus:** Wave 2 + Wave 3 closeout complete (search UX, priority/deadline views, task detail comments/context)
- **Build:** Passing (Next.js build + TypeScript clean)
- **API:** Core REST surface implemented (projects, plans, phases, tasks, backlog, queries, connectors)
- **MCP:** Stdio server + tool modules wired and smoke-tested against local API
- **Portfolio:** 5 enabled projects, 480 active tasks, 510 synced tasks, 139 synced backlog items
- **Dashboard:** All 4 views verified working (Today, Portfolio, Kanban, Project Detail)
- **Known bugs:** 0 open (see BACKLOG.md)

## Review Response Plan (2026-02-11 Browser Audit)

### Wave 1 — Critical Usability (P1)
- B32 Task property editing in detail panel (`status`, `priority`, `owner`, `due date`)
- B33 Task creation flows fully wired (`global`, `project`, `quick add`)
- B34 Single-task completion interaction on list rows
- B35 Task detail depth (`description`, `notes`) for actionable context

Exit criteria:
- User can create, edit, and complete tasks without MCP.
- Every primary CTA has clear success/error/loading feedback.

### Wave 2 — Data Trust + Quality (P1)
- B36 Duplicate synced-task remediation (`source_id` normalization + dedupe safety checks)
- B37 Smoke/test data cleanup and guardrails
- B39 Health model calibration for stagnant/high-volume backlog states

Exit criteria:
- No duplicate visible task rows for synced projects.
- No synthetic smoke artifacts in live views.
- Health distribution reflects actual risk, not uniformly green.

Status: Completed

### Wave 3 — Scalability + Navigation (P1/P2)
- B38 Sidebar project quick-nav
- B40 Kanban default scoping + high-volume UX guardrails
- B41 Today prioritization improvements (not all work in `Later`)
- B43 Activity readability upgrades (entity names/titles in feed rows)
- B44 Interaction feedback polish hardening

Exit criteria:
- Portfolio-scale datasets remain navigable without overwhelm.
- Activity feeds are interpretable without drilling into each entity.

Status: Completed (B38, B40, B41, B43, B44, B45, B46, B47)

## Implementation Progress

### Phase 1: Data Foundation — Complete
- B1 Done — Next.js 15, TypeScript, Tailwind 4, pnpm
- B2 Done — Supabase CLI linked, 6 migrations
- B3 Done — All 8 tables, 16 enums, indexes, RLS, FTS, display_id trigger
- B4 Partial — 3 actors + 3 projects seeded (spec: 5-8 projects)
- B5 Done — Service role client, anon client, SSR middleware

### Phase 2: REST API — Complete (MVP Scope)
- B6-B8 Done — Validation, activity logging, health computation
- B9-B12 Done — Project, Plan, Phase, Task endpoints (15 route handlers)
- B13 Done — Backlog endpoints
- B14 Done — Query endpoints (status, whats-next, blockers, deadlines, search, activity)
- B15 Done — Connector endpoints (GET, upsert, sync)

### Phase 3: MCP Server — Complete
- B16 Done — Plan/phase/backlog/query/task tools route-aligned; stdio contract/e2e smoke passing including `validate_task`
- B17-B18 Done — ADF parser + sync_project tool
- B29 Done — Claude Desktop wiring
- B30 Done — ADF sync validation executed for 3 active real project connectors

### Phase 4: ADF Connector — Done (via MCP)
- Parser and sync tool built into mcp-server/src/adf/ and mcp-server/src/tools/adf-tools.ts

### Phase 5: Dashboard — Complete (MVP Scope)
- B19 Done — Dashboard shell: root layout, sidebar (Today/Portfolio/Kanban), header, ToastContainer
- B21 Done — Today view: live data from /api/whats-next, deadline bucket grouping, loading/error states
- B22 Done — Portfolio view: live projects with category filter, footer stats, project cards link to detail
- B23 Done — Project detail: adaptive layout (flat/planned), PhaseAccordion, QuickAdd, BacklogSection, SyncIndicator
- B24 Done — Kanban: 4-column status board, HTML5 drag-and-drop, project filter, synced item protection
- B27 Done — Task detail panel: slide-out with properties, activity log, read-only for synced items
- B28 Done — Quick-add: inline within project detail for native projects
- B20 Deferred — Auth (single-user MVP)
- B25/B26 Legacy deferred IDs superseded by B46/B47 (implemented)
- Component library: HealthBadge, PriorityChip, EmptyState, Toast, Modal, ViewSwitcher, FilterBar, StatusColumn, TaskCard, SyncIndicator
- Shared utilities: cn(), apiFetch(), API response types

### Deployment
- B31 Pending — Vercel deploy

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
- [x] Phase 1: Data Foundation — scaffold, migrations, seed
- [x] Phase 2: REST API — core endpoints (projects, plans, phases, tasks, backlog, queries)
- [x] **Phase 2 remaining: Connector endpoints (B15)**
- [x] **Phase 3 remaining: Validate_task MCP parity and broader connector trials (B16/B30)**
- [x] **Phase 5: Dashboard — views, components (MVP scope, auth deferred)**
- [ ] **Deployment: Vercel deploy, env vars, production DB (B31)**
- [x] Fix open bugs: actor ID hardcoding (BUG-2)
- [x] Portfolio Status API (/api/projects/status) <!-- id: 24 -->

## Blockers

- None

## Session Log

| Date | Summary |
|------|---------|
| 2026-02-10 | Project initialized |
| 2026-02-10 | ... (initial sessions) ... |
| 2026-02-11 | **Port reconfiguration.** Main app moved to port 3005. MCP server updated to connect to 3005. Verified connection via Claude Desktop. |
| 2026-02-11 | **Capability Access.** Registered Memory Layer and Knowledge Base via `capabilities-registry`. Fixed relative path issues with `memory-layer`. |
| 2026-02-11 | **ADF Alignment.** Moved `status.md` to root, linked `brief.md`. Resumed Develop Phase 6 (Build). |
| 2026-02-11 | **Dashboard scaffold.** Phase 5 started: Zed-inspired Today view, root layout with sidebar, portfolio/project/kanban page stubs, TaskItem component, Tailwind theme with custom design tokens, Stitch design references added to docs/inbox. |
| 2026-02-11 | **UI/UX prep.** Reviewed full status + backlog. Committed MCP tool name aliases (update_plan, get_project) for design parity. Loaded design context: interface spec, 12 Stitch mockups cataloged, UI code inventory (4 stub pages, 4 components, theme). Loaded Stitch + Chrome browser tools for design workflow. Ready to begin Phase 5 implementation. |
| 2026-02-11 | **Dashboard implementation complete.** 5 commits across 5 phases: (1) Foundation — cn() utility, API types, 6 shared UI primitives. (2) Today view — live /api/whats-next data, deadline buckets, loading/error. (3) Portfolio — category filtering, live stats footer. (4) Project Detail — adaptive flat/planned layout, PhaseAccordion, TaskDetailPanel, QuickAdd, BacklogSection, SyncIndicator, data_origin enforcement. (5) Kanban — HTML5 DnD, project filter, optimistic updates, synced item protection. ~18 new files, ~8 modified. TypeScript clean, Next.js build passing. |
| 2026-02-11 | **Visual validation attempt.** Started dev server (port 3005, responding 200). Attempted Chrome browser automation via claude-in-chrome MCP — server connected but Chrome extension not linked. Committed parallel MCP agent changes (ADF parser improvements, connector sync fixes). |
| 2026-02-11 | **Chrome browser tool test.** Attempted claude-in-chrome connection after Chrome restart — extension still not connecting ("No Chrome extension connected"). Needs further debugging of extension ↔ MCP link. |
| 2026-02-11 | **Dashboard visual testing & bug fixes.** Connected Chrome browser tools (via `/chrome` command). Fixed 4 blockers: (1) SSR fetch failure — NEXT_PUBLIC_APP_URL pointed to wrong port. (2) Auth middleware redirect disabled for MVP. (3) Project name missing from whats-next join. (4) Portfolio 500 — batched task activity queries to avoid Supabase URI length limit. All 4 views verified working: Today, Portfolio, Kanban, Project Detail. KB entry added for chrome extension troubleshooting. |
| 2026-02-11 | **UI/UX usability review.** Identified gaps before deploy: (1) No project selection/management UI — need settings page showing available/active projects + sync status. (2) Polling/heartbeat — currently manual only; need "Last synced" + "Sync now" button. (3) Tags not implemented (Todoist feature, P2). (4) Missing views: Search, Priority board (B25), Deadline view (B26). Next: Build settings page for project management + sync controls. |
| 2026-02-11 | **Full browser-level review (Chrome automation).** Clicked through all 5 views (Today, Portfolio, Project Detail, Kanban, Settings). Benchmark: Todoist, equal MCP+dashboard usage. **Key findings:** (1) Dashboard is effectively read-only — task property editing, task creation (NEW TASK, quick-add, global +), and task completion checkboxes are all non-functional. This is the #1 blocker. (2) Today view groups all tasks under "LATER" — no urgency differentiation. (3) Duplicate tasks in synced projects (Krypton). (4) Kanban shows 587 pending tasks in one column — needs per-project default. (5) Health all green despite 587 pending/0 in-progress — needs calibration. (6) Smoke test data mixed with real data. **What's strong:** Portfolio cards with Focus/Next Up/sync metadata, Settings sync table, contextual breadcrumbs, synced item READ ONLY protection, dark theme. **Next steps:** Wire up task CRUD (edit properties, create, complete) as critical priority, then fix duplicates, calibrate health, add sidebar project list. |
| 2026-02-11 | **Wave 2 + Wave 3 (high-impact) closeout pass.** Completed trust-quality backend hardening and UI wiring: sync quality endpoint + portfolio trust aggregate + MCP tools, smoke-data cleanup utility, source_id normalization and stale-row cleanup, health calibration for stalled high-volume queues. Delivered Wave 3 subset: sidebar project quick-nav, kanban default project scoping with high-volume card cap controls, improved Today scoring (blocked visibility + flow tie-breaks), and project activity readability with entity labels. Added trust drill-through filters on Portfolio (`trust=red|yellow|green`) and trust badges in Portfolio/Settings. Validation green: Next build, API contracts, MCP contract/e2e, dev server on :3005. |
| 2026-02-11 | **Wave 3 completion pass.** Completed remaining backlog: B42 task detail depth (comments endpoint + comments UI + richer task context/activity snippets), B45 dedicated `/search` experience wired from header with enabled-scope results, B46 `/projects/:id/priority` board, and B47 `/projects/:id/deadlines` view. Validation green: Next build, API contracts, MCP contract/e2e, dev server reachable on :3005. |
| 2026-02-11 | **MCP parity + connector trial closeout.** Updated MCP e2e smoke to assert `validate_task` behavior, then ran connector validation against 3 active ADF projects via `npm run test:adf-sync` (all pass). Marked B16/B30 complete across tracking artifacts. |

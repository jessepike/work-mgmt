---
type: "tracking"
project: "Work Management"
created: "2026-02-10"
updated: "2026-02-12"
---

# Backlog

## Queue

| ID | Item | Type | Component | Pri | Size | Status |
|----|------|------|-----------|-----|------|--------|
| B1 | Scaffold Next.js 15 project with TypeScript, Tailwind CSS 4, pnpm | Setup | App | P1 | S | Done |
| B2 | Initialize Supabase CLI, link existing project, create migration structure | Setup | Database | P1 | S | Done |
| B3 | Create migration: extensions, enums, all entity tables, triggers, indexes, RLS, FTS | New spec | Database | P1 | L | Done |
| B4 | Create seed data: actor_registry + 5-8 real projects (mix connected/native) | Setup | Database | P1 | M | Done |
| B5 | Supabase client setup: server client (service role), browser client (anon key), middleware | Setup | API | P1 | S | Done |
| B6 | Shared validation logic: workflow_type constraints, data_origin enforcement, source_id rules | New spec | API | P1 | M | Done |
| B7 | Activity logging helper: logActivity() with actor context, standard actions | New spec | API | P1 | S | Done |
| B8 | Health computation function: query-time, worst-signal-wins, override support | New spec | API | P1 | S | Done |
| B9 | Project endpoints: GET list, GET detail (with health + connector info), POST, PATCH, DELETE (archive) | New spec | API | P1 | M | Done |
| B10 | Plan endpoints: GET list, POST (with one-active-plan validation), PATCH, POST approve | New spec | API | P1 | M | Done |
| B11 | Phase endpoints: GET list, POST, PATCH, start, complete, DELETE | New spec | API | P1 | S | Done |
| B12 | Task endpoints: GET list/detail, POST (workflow validation, display_id trigger), PATCH, POST complete, POST validate | New spec | API | P1 | L | Done |
| B13 | Backlog endpoints: GET list, POST, PATCH, POST promote (creates task, links, validates plan_id for planned) | New spec | API | P1 | M | Done |
| B14 | Cross-cutting query endpoints: status, whats-next, blockers, deadlines, search (FTS), activity | New spec | API | P1 | L | Done |
| B15 | Connector endpoints: GET list, POST, POST sync | New spec | API | P2 | S | Done |
| B16 | MCP server: stdio transport, tool definitions for all CRUD + query tools | New spec | MCP | P1 | L | Done |
| B17 | ADF connector: markdown parser for status.md, tasks.md, backlog.md | New spec | MCP | P1 | M | Done |
| B18 | ADF connector: sync_project tool — parse, map to entities, upsert via REST (source_id) | New spec | MCP | P1 | M | Done |
| B19 | Dashboard shell: root layout, sidebar, header, auth gate, view switcher | New spec | Dashboard | P1 | M | Done |
| B20 | Auth pages: Supabase Auth UI login, session management | New spec | Dashboard | P1 | S | Deferred |
| B21 | Today view: whats-next data, grouped by deadline bucket, task items | New spec | Dashboard | P1 | M | Done |
| B22 | Portfolio view: project cards, filter bar, health badges, create project modal | New spec | Dashboard | P1 | M | Done |
| B23 | Project detail view: adaptive layout (flat vs planned), backlog section, sync indicator | New spec | Dashboard | P1 | L | Done |
| B24 | Status kanban view: columns by status, task cards, drag-and-drop (native only) | New spec | Dashboard | P2 | M | Done |
| B25 | Priority board view: columns by priority | New spec | Dashboard | P2 | S | Deferred |
| B26 | Deadline view: grouped by time bucket | New spec | Dashboard | P2 | S | Deferred |
| B27 | Task detail panel: slide-out, all fields, activity log, inline editing | New spec | Dashboard | P1 | M | Done |
| B28 | Quick-add component: title + Enter, optional field expansion | New spec | Dashboard | P2 | S | Done |
| B29 | Wire MCP server to Claude Desktop config, validate read + write operations | Setup | MCP | P1 | S | Done |
| B30 | Test ADF connector against 3+ real project repos | Enhancement | MCP | P1 | M | Done |
| B31 | Deploy to Vercel, configure environment variables, push Supabase migrations to production | Setup | App | P1 | M | Partial |
| B32 | Make task properties editable in detail panel (status, priority, owner, due date) | New spec | Dashboard | P1 | L | Done |
| B33 | Wire task creation paths end-to-end (global new task, project new task, quick add) | New spec | Dashboard | P1 | M | Done |
| B34 | Wire task completion interaction on task rows (single-click complete with optimistic UI) | New spec | Dashboard | P1 | M | Done |
| B35 | Add task description/notes editing in Task Detail panel | Enhancement | Dashboard | P1 | M | Done |
| B36 | Fix duplicate synced tasks by tightening source_id canonicalization + de-dupe guardrails | Bug | MCP/API | P1 | L | Done |
| B37 | Add cleanup utility for smoke/test artifacts (identify + archive/delete) | Ops | Data | P1 | M | Done |
| B38 | Add sidebar project list with enabled-project scope and quick navigation | UX | Dashboard | P1 | M | Done |
| B39 | Calibrate project health signals for high-pending/low-flow projects | Enhancement | API | P1 | M | Done |
| B40 | Kanban scalability pass: default project selection, empty/all-state handling, high-volume guardrails | UX | Dashboard | P2 | M | Done |
| B41 | Improve Today prioritization quality (deadline + priority + flow signals, quick complete) | Enhancement | API/Dashboard | P2 | M | Done |
| B42 | Task detail depth pass (due date, owner picker, comments/activity context) | Enhancement | Dashboard | P2 | L | Done |
| B43 | Activity log readability pass (include entity labels/task titles in event rows) | Polish | API/Dashboard | P2 | S | Done |
| B44 | Feedback polish pass (loading/disabled states + explicit "not implemented" affordances) | Polish | Dashboard | P2 | S | Done |
| B45 | Search validation + dedicated search result UX for portfolio-scale datasets | Enhancement | Dashboard | P2 | M | Done |
| B46 | Implement Priority Board view (`/projects/:id/priority`) | Deferred scope | Dashboard | P2 | M | Done |
| B47 | Implement Deadline View (`/projects/:id/deadlines`) | Deferred scope | Dashboard | P2 | M | Done |
| B48 | Add trust remediation UX (per-project "why yellow/red" + "fix now" actions) | Enhancement | Dashboard/API | P1 | M | Pending |
| B49 | Clarify health vs trust semantics in UI (labels, legend, footer consistency) | UX | Dashboard | P1 | S | Pending |
| B50 | Make portfolio footer status chips consistently interactive (or explicitly non-interactive) | UX | Dashboard | P2 | S | Pending |
| B51 | Add theme switcher (light/dark/system) with persisted preference | New spec | Dashboard | P2 | M | Pending |
| B52 | Persist Settings filters/sort/view state and restore on return | UX | Dashboard | P2 | S | Pending |
| B53 | Show backlog identifiers in UI rows/cards (human-readable, project-scoped) | Enhancement | API/Dashboard | P1 | M | Pending |
| B54 | Define cross-project backlog identifier strategy for portfolio aggregation | New spec | Data/API | P1 | M | Pending |
| B55 | Add portfolio-wide backlog view with search/filter/grouping across projects | New spec | Dashboard/API | P2 | M | Pending |
| B56 | Fix completed-task row affordance conflict (disabled checkbox + done icon) | Bug | Dashboard | P1 | S | Pending |
| B57 | Bi-directional sync architecture for ADF-governed projects (write-back + conflict handling) | New spec | API/MCP/ADF | P1 | L | Pending |
| B58 | UI write support for synced items via governed bi-directional sync controls | New spec | Dashboard/API | P1 | L | Pending |
| B59 | ADF spec alignment pass for tasks/backlog/status interoperability with work-management | New spec | ADF/MCP/API | P1 | L | Pending |
| B60 | Voice/natural-language capture in UI for backlog/task commands (future) | Future feature | Dashboard/Agent | P3 | M | Pending |

## Notes

### B4 — Done
Seed includes 3 actors and 7 projects with mixed connected/native workflow patterns.

### B14 — Done
Status, blockers, deadlines, search, whats-next, and activity endpoints are implemented.

### B16 — Done
CRUD/query tool coverage is implemented with interface-parity aliases. Contract/e2e smoke scripts and CI workflow are in place for MCP validation.

### B30 — Done
Validated on 2026-02-11 via `npm run test:adf-sync` against 3 active ADF-connected projects:
- `b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12` (count=83, tasks=0, backlog=83, status=true)
- `c1e73937-ebd3-46e4-b51b-25a1e7694b28` (count=16, tasks=15, backlog=0, status=true)
- `885e0a47-1ad7-4e32-af01-02111e626a15` (count=23, tasks=7, backlog=16, status=true)

### B31 — Partial
Deployment preflight is now executable via `npm run qa:deploy-readiness` (env + migration presence + API/MCP/ADF validation gates), and rollout steps are codified in `docs/runbooks/production-rollout.md`. Remaining work is environment rollout and production migration execution.

### B32-B35 — CRUD Enablement Track (Critical)
These items are the primary blockers for shifting the dashboard from read-only to active work management.

### B36 — Duplicate Sync Bug
Likely root cause: same logical task represented by divergent markdown paths/headers generating distinct source_id values across sync runs.

### B39 — Health Calibration
Current heuristic over-weights immediate blockers/deadlines and under-weights stagnant high-pending inventory; needs flow/aging signals.

## Known Issues

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| BUG-1 | ~~GET /api/tasks referenced nonexistent `display_id_prefix` column on project~~ | High | Fixed |
| BUG-2 | ~~Actor ID hardcoded as 'jess' in activity logging~~. Replaced with request actor resolution + actor_registry validation. | Medium | Fixed |
| BUG-3 | data_origin enforcement not integrated in PATCH endpoints (validation exists but unused) | Medium | Fixed |
| BUG-4 | package.json name is "temp_next_app" — should be "work-management" | Low | Fixed |

## Archive

| ID | Item | Completed | Notes |
|----|------|-----------|-------|
| — | — | — | — |

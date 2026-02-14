---
type: "tracking"
project: "Work Management"
created: "2026-02-10"
updated: "2026-02-13"
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
| B20 | Auth pages: Supabase Auth UI login, session management. Blocker for Vercel deployment — API routes must be protected before going public. | New spec | Dashboard/API | P1 | M | Done |
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
| B31 | Deploy to Vercel, configure environment variables, push Supabase migrations to production | Setup | App | P1 | M | Done |
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
| B48 | Add trust remediation UX (per-project "why yellow/red" + "fix now" actions) | Enhancement | Dashboard/API | P1 | M | Done |
| B49 | Clarify health vs trust semantics in UI (labels, legend, footer consistency) | UX | Dashboard | P1 | S | Done |
| B50 | Make portfolio footer status chips consistently interactive (or explicitly non-interactive) | UX | Dashboard | P2 | S | Done |
| B51 | Add theme switcher (light/dark/system) with persisted preference | New spec | Dashboard | P2 | M | Done |
| B52 | Persist Settings filters/sort/view state and restore on return | UX | Dashboard | P2 | S | Done |
| B53 | Show backlog identifiers in UI rows/cards (human-readable, project-scoped) | Enhancement | API/Dashboard | P1 | M | Done |
| B54 | Define cross-project backlog identifier strategy for portfolio aggregation | New spec | Data/API | P1 | M | Done |
| B55 | Add portfolio-wide backlog view with search/filter/grouping across projects | New spec | Dashboard/API | P2 | M | Done |
| B56 | Fix completed-task row affordance conflict (disabled checkbox + done icon) | Bug | Dashboard | P1 | S | Done |
| B57 | Bi-directional sync architecture for ADF-governed projects (write-back + conflict handling) | New spec | API/MCP/ADF | P1 | L | Done |
| B58 | UI write support for synced items via governed bi-directional sync controls | New spec | Dashboard/API | P1 | L | Done |
| B59 | ADF spec alignment pass for tasks/backlog/status interoperability with work-management | New spec | ADF/MCP/API | P1 | L | Pending |
| B60 | Voice/natural-language capture in UI for backlog/task commands (future) | Future feature | Dashboard/Agent | P3 | M | Pending |
| B61 | Add `type` support to backlog API + MCP — `GET /api/backlog?type=`, `POST` accepts `type` field, MCP `create_backlog_item` and `list_backlog` support `type` param. Enables Inbox/Ideas routing. | Enhancement | API/MCP | P2 | S | Done |
| B62 | Add "Findings to Review" dashboard widget — surface backlog items with `type=review` in a dedicated section, grouped by source. Enable adopt/defer/dismiss workflow directly from dashboard. Source: CC Insights /ingest design 2026-02-12. | New spec | Dashboard | P2 | M | Pending |
| B67 | Inbox project + dashboard view — catch-all project for untriaged items, ideas, and low-confidence ingest results. Dashboard page at `/inbox` with triage actions. | New spec | Dashboard/API | P1 | M | Done |
| B68 | Ideas view — cross-project dashboard page at `/ideas` showing all `type=idea` backlog items across enabled projects. | New spec | Dashboard | P2 | M | Done |
| B69 | Krypton /ingest routing update — `project-seed` type now routes to Inbox as `type=idea` backlog items instead of creating full projects. Low-confidence items route to Inbox with no type. | Enhancement | Krypton | P1 | S | Done |
| B70 | Inbox triage UX — add interactive actions to Inbox view: set type, move to project, archive. Currently read-only table. | Enhancement | Dashboard | P2 | M | Pending |
| B63 | Post-deploy: update MCP server API_URL to production Vercel URL — change `API_URL` in `~/.claude.json` mcpServers from `http://localhost:3005/api` to production URL. Verify MCP tools load and function against remote API. Requires B20 + B31. | Ops | MCP | P1 | S | Done |
| B64 | Implement automated local->cloud ADF ingest runner (Mac launchd/cron) with per-project mapping, cadence, retries, and logging so Vercel dashboard stays current without manual sync. | New spec | Sync/Ops | P1 | M | Pending |
| B65 | Finalize sync architecture decision doc: laptop parser + API ingest vs git-based server pull; define source-of-truth, failure modes, and security model (API secret + scoped auth). | Design | Sync/Architecture | P1 | M | Pending |
| B66 | Add sync observability: last successful ingest per project, last error, stale-sync alerts, and dashboard remediation actions. | Enhancement | API/Dashboard | P2 | M | Pending |

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

### B31 — Done
Production rollout completed on 2026-02-12: Vercel project linked and deployed (`https://work-management-kappa.vercel.app`), production env vars configured, Supabase cloud migrations pushed to `fxidgnsjhjdaunzzbxpe`, and post-deploy API/MCP smoke validations executed.

**Deployment path (decided 2026-02-12):** B20 (auth) → B31 (Vercel deploy) → B63 (MCP config update). Vercel is the target platform. Supabase is already cloud — no DB migration. MCP server stays local (stdio), just needs API_URL pointed at production. See global memory decision `fa7ae4b1`.

### B32-B35 — CRUD Enablement Track (Critical)
These items are the primary blockers for shifting the dashboard from read-only to active work management.

### B36 — Duplicate Sync Bug
Likely root cause: same logical task represented by divergent markdown paths/headers generating distinct source_id values across sync runs.

### B39 — Health Calibration
Current heuristic over-weights immediate blockers/deadlines and under-weights stagnant high-pending inventory; needs flow/aging signals.

### B53/B54 — Done
DB-first foundation: `backlog_admin_item` table + RLS + indexes, admin API, markdown/DB sync tooling. UI integration: identifiers shown in project detail (BacklogSection) and portfolio backlog page. Cross-project strategy: project-scoped `B#` keys, disambiguated by project name in aggregated views.

### B52 — Done
Settings preference state now persists and restores for sync filter mode and backlog-admin status filter.

### B48/B49 — Done
Settings sync table now includes remediation guidance and one-click trust actions (`activate`, `normalize paths`, `dedupe IDs`) for non-green projects. Portfolio now distinguishes health vs trust explicitly (legend + dedicated health filter and clickable footer chips).

### B51 — Done
Theme toggle added in header with `system/light/dark` modes, persisted in local storage and applied at app shell level.

### B55/B56 — Done
Added portfolio-wide backlog page (`/backlog`) with status/priority filtering and ID display. Completed task rows no longer show non-functional selection checkboxes.

### B57 — Done
Implemented governed write-back backend path for synced ADF entities:
- New API endpoint: `POST /api/connectors/writeback` with `dry_run` + `strict_conflicts` behavior.
- Conflict checks: entity scope validation, synced-only enforcement, `expected_updated_at` guard.
- Write targets: synced `task`, synced `backlog_item`, and `project_status` (`status.md` current_stage/focus).
- ADF file mutation engine: source_id resolution (`id`/`slug`), table/checkbox line patching, status key upsert.
- MCP parity: added `governed_writeback_task`, `governed_writeback_backlog_item`, `governed_writeback_status`.
- Validation: app build + MCP contract smoke pass. E2E/writeback smoke currently skip when no active ADF connectors are configured.

### B58 — Done
Implemented synced-item UI write support using governed controls:
- Task Detail panel now exposes `Governed Edit` for synced tasks with:
  - dry-run preview (`before/after` diff lines),
  - conflict feedback,
  - explicit apply confirmation.
- Project Backlog section now exposes `Governed Edit` for synced backlog items with:
  - draft editing fields (title/description/status/priority),
  - dry-run preview,
  - conflict feedback,
  - explicit apply confirmation.

### B61/B67/B68/B69 — Done (Inbox & Ideas)
Inbox project created in production (`ce973e7b-f899-46ec-9ac9-cffa31b56d1a`). Backlog API and MCP tools support `type` filtering. Dashboard views at `/inbox` and `/ideas`. Krypton `/ingest` updated to route `project-seed` as Inbox ideas. 6 wrongly-created idea-projects archived and re-captured as idea backlog items.

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

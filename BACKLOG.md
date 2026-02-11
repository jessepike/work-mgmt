---
type: "tracking"
project: "Work Management"
created: "2026-02-10"
updated: "2026-02-11"
---

# Backlog

## Queue

| ID | Item | Type | Component | Pri | Size | Status |
|----|------|------|-----------|-----|------|--------|
| B1 | Scaffold Next.js 15 project with TypeScript, Tailwind CSS 4, pnpm | Setup | App | P1 | S | Done |
| B2 | Initialize Supabase CLI, link existing project, create migration structure | Setup | Database | P1 | S | Done |
| B3 | Create migration: extensions, enums, all entity tables, triggers, indexes, RLS, FTS | New spec | Database | P1 | L | Done |
| B4 | Create seed data: actor_registry + 5-8 real projects (mix connected/native) | Setup | Database | P1 | M | Partial |
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
| B30 | Test ADF connector against 3+ real project repos | Enhancement | MCP | P1 | M | Pending |
| B31 | Deploy to Vercel, configure environment variables, push Supabase migrations to production | Setup | App | P1 | M | Pending |

## Notes

### B4 — Partial
Seed has 3 actors + 3 projects. Spec called for 5-8 projects with mix of connected/native.

### B14 — Done
Status, blockers, deadlines, search, whats-next, and activity endpoints are implemented.

### B16 — Done
CRUD/query tool coverage is implemented with interface-parity aliases. Contract/e2e smoke scripts and CI workflow are in place for MCP validation.

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

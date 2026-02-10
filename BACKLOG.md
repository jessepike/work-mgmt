---
type: "tracking"
project: "Work Management"
created: "2026-02-10"
updated: "2026-02-10"
---

# Backlog

## Queue

| ID | Item | Type | Component | Pri | Size | Status |
|----|------|------|-----------|-----|------|--------|
| B1 | Scaffold Next.js 15 project with TypeScript, Tailwind CSS 4, pnpm | Setup | App | P1 | S | Pending |
| B2 | Initialize Supabase CLI, link existing project, create migration structure | Setup | Database | P1 | S | Pending |
| B3 | Create migration: extensions, enums, all entity tables, triggers, indexes, RLS, FTS | New spec | Database | P1 | L | Pending |
| B4 | Create seed data: actor_registry + 5-8 real projects (mix connected/native) | Setup | Database | P1 | M | Pending |
| B5 | Supabase client setup: server client (service role), browser client (anon key), middleware | Setup | API | P1 | S | Pending |
| B6 | Shared validation logic: workflow_type constraints, data_origin enforcement, source_id rules | New spec | API | P1 | M | Pending |
| B7 | Activity logging helper: logActivity() with actor context, standard actions | New spec | API | P1 | S | Pending |
| B8 | Health computation function: query-time, worst-signal-wins, override support | New spec | API | P1 | S | Pending |
| B9 | Project endpoints: GET list, GET detail (with health + connector info), POST, PATCH, DELETE (archive) | New spec | API | P1 | M | Pending |
| B10 | Plan endpoints: GET list, POST (with one-active-plan validation), PATCH, POST approve | New spec | API | P1 | M | Pending |
| B11 | Phase endpoints: GET list, POST, PATCH | New spec | API | P1 | S | Pending |
| B12 | Task endpoints: GET list/detail, POST (workflow validation, display_id trigger), PATCH, POST complete, POST validate | New spec | API | P1 | L | Pending |
| B13 | Backlog endpoints: GET list, POST, PATCH, POST promote (creates task, links, validates plan_id for planned) | New spec | API | P1 | M | Pending |
| B14 | Cross-cutting query endpoints: status, whats-next, blockers, deadlines, search (FTS), activity | New spec | API | P1 | L | Pending |
| B15 | Connector endpoints: GET list, POST, POST sync | New spec | API | P2 | S | Pending |
| B16 | MCP server: stdio transport, tool definitions for all CRUD + query tools | New spec | MCP | P1 | L | Pending |
| B17 | ADF connector: markdown parser for status.md, tasks.md, backlog.md | New spec | MCP | P1 | M | Pending |
| B18 | ADF connector: sync_project tool — parse, map to entities, upsert via REST (source_id) | New spec | MCP | P1 | M | Pending |
| B19 | Dashboard shell: root layout, sidebar, header, auth gate, view switcher | New spec | Dashboard | P1 | M | Pending |
| B20 | Auth pages: Supabase Auth UI login, session management | New spec | Dashboard | P1 | S | Pending |
| B21 | Today view: whats-next data, grouped by deadline bucket, task items | New spec | Dashboard | P1 | M | Pending |
| B22 | Portfolio view: project cards, filter bar, health badges, create project modal | New spec | Dashboard | P1 | M | Pending |
| B23 | Project detail view: adaptive layout (flat vs planned), backlog section, sync indicator | New spec | Dashboard | P1 | L | Pending |
| B24 | Status kanban view: columns by status, task cards, drag-and-drop (native only) | New spec | Dashboard | P2 | M | Pending |
| B25 | Priority board view: columns by priority | New spec | Dashboard | P2 | S | Pending |
| B26 | Deadline view: grouped by time bucket | New spec | Dashboard | P2 | S | Pending |
| B27 | Task detail panel: slide-out, all fields, activity log, inline editing | New spec | Dashboard | P1 | M | Pending |
| B28 | Quick-add component: title + Enter, optional field expansion | New spec | Dashboard | P2 | S | Pending |
| B29 | Wire MCP server to Claude Desktop config, validate read + write operations | Setup | MCP | P1 | S | Pending |
| B30 | Test ADF connector against 3+ real project repos | Enhancement | MCP | P1 | M | Pending |
| B31 | Deploy to Vercel, configure environment variables, push Supabase migrations to production | Setup | App | P1 | M | Pending |

## Archive

| ID | Item | Completed | Notes |
|----|------|-----------|-------|
| — | — | — | — |

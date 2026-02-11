# work-management

## Intent

See `docs/intent.md`

## Classification

- **Type:** App
- **Scale:** personal
- **Scope:** mvp
- **Complexity:** multi-component

## Current Stage

Develop

## Context Map

| File | Load When | Purpose |
|------|-----------|---------|
| docs/intent.md | Always | North Star |
| status.md | Always | Session state — review at start, update at end |
| docs/discover-brief.md | Reference | Project contract, success criteria |
| docs/design.md | Develop | Design overview, decisions, handoff notes |
| docs/design-architecture.md | Develop | System architecture, auth, project structure |
| docs/design-data-model.md | Develop | Supabase schema, migrations, indexes, RLS, FTS |
| docs/design-interface.md | Develop | REST API contracts, MCP tools, dashboard views |
| BACKLOG.md | Always | Prioritized implementation tasks |

<!-- Agent Session Protocol inherited from global ~/.claude/CLAUDE.md -->

---

## Stack

- Language: TypeScript 5+
- Runtime: Node.js 20+
- Framework: Next.js 15 (App Router)
- Database: Supabase (Postgres) — project `fxidgnsjhjdaunzzbxpe`
- Auth: Supabase Auth (JWT)
- Styling: Tailwind CSS 4
- MCP: @modelcontextprotocol/sdk (stdio)
- Package manager: pnpm
- Hosting: Vercel

## Commands

- Setup: `pnpm install && supabase start`
- Dev: `pnpm dev`
- Test: `pnpm test`
- Migrations: `supabase migration new <name>` / `supabase db reset` / `supabase db push`
- Deploy: `vercel`

## Key Design Rules

- Route handlers use **service role key** (not user JWT). API is the security boundary.
- `data_origin = 'synced'` entities are read-only except via connector.
- Health is computed at query time, never stored. `health_override` takes precedence.
- Display IDs auto-assigned via DB trigger. Never set manually.
- One non-completed plan per project (API 409 + partial unique index).

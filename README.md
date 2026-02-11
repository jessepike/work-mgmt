## Work Management

Work Management is a Next.js + Supabase system of record for projects, plans, phases, tasks, backlog, and activity, with an MCP adapter for agent workflows.

## Apps

- Main app/API: `/` (Next.js App Router)
- MCP server: `/mcp-server` (stdio or SSE transport)

## Local Setup

1. Install dependencies:
```bash
npm install
npm --prefix mcp-server install
```

2. Ensure `.env.local` has:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

3. Run the app on port `3005`:
```bash
npm run dev
```

4. Build checks:
```bash
npm run build
npm --prefix mcp-server run build
```

5. API contract smoke test (requires app running):
```bash
npm run test:api-contract
```

6. ADF connector validation (requires app running + active ADF connectors):
```bash
npm run test:adf-sync
```

## API Base URL

- Local API base: `http://localhost:3005/api`

## Key Paths

- API routes: `src/app/api`
- Shared API helpers: `src/lib/api`
- Supabase clients/types: `src/lib/supabase`, `src/lib/types/database.ts`
- MCP tools: `mcp-server/src/tools`
- ADF parser + sync: `src/lib/adf/parser.ts`, `src/app/api/connectors/sync/route.ts`
- Migrations: `supabase/migrations`

## Status and Planning

- Current status: `status.md`
- Backlog: `BACKLOG.md`
- Design docs: `docs/`
- Runbooks: `docs/runbooks/`

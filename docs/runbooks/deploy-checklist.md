# Deploy Checklist

## Scope
Production readiness checklist for Work Management backend + MCP integration.

## 1) Environment
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_URL` for MCP runtime (points to deployed `/api`)
- `MCP_PORT` (if SSE mode is used)
- Run automated preflight:
  - `npm run qa:deploy-readiness`

## 2) Database
- Apply all migrations in `supabase/migrations`.
- Run `supabase/seed.sql` only for non-production/test environments.
- Verify unique constraints:
  - `task(project_id, source_id)`
  - `backlog_item(project_id, source_id)`

## 3) API Validation
- `npm run test:api-contract`
- Validate key routes manually:
  - `/api/projects`
  - `/api/tasks`
  - `/api/backlog`
  - `/api/activity`
  - `/api/connectors/sync`

## 4) MCP Validation
- `npm --prefix mcp-server run smoke:contract`
- `npm --prefix mcp-server run smoke:e2e` (strict in controlled env)
- Optional: GitHub Actions `MCP Smoke` workflow dispatch for strict e2e.

## 5) Connector Validation
- Run `npm run test:adf-sync` against at least 3 connected repos.
- Confirm status/task/backlog entities are partitioned by project and upsert idempotently.

## 6) Release Gates
- No failing smoke checks.
- No migration errors.
- UI team confirms API contract unchanged for active endpoints.
- Rollback plan defined (previous deploy + DB backup checkpoint).

## 7) Rollout Execution
- Follow `/docs/runbooks/production-rollout.md` for production migration + Vercel release steps.

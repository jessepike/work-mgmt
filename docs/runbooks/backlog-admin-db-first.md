# Backlog Admin (DB-First) Runbook

## Scope
Phase 1 is intentionally scoped to the **Work Management** project only.

## Components
- Schema: `backlog_admin_item` (project-scoped, keyed by `B#`)
- API:
  - `GET /api/admin/backlog-items`
  - `POST /api/admin/backlog-items`
  - `PATCH /api/admin/backlog-items/:id`
- Sync scripts:
  - `npm run sync:backlog-admin:import` (BACKLOG.md -> DB)
  - `npm run sync:backlog-admin:export` (DB -> BACKLOG.md)

## First-time setup
1. Apply migration:
```bash
supabase db push
```
2. Import current markdown backlog into DB:
```bash
npm run sync:backlog-admin:import
```

## Daily workflow
1. Make backlog edits via API/UI (when UI lands).
2. Export DB changes back to markdown:
```bash
npm run sync:backlog-admin:export
```
3. Commit updated `BACKLOG.md` for repo traceability.

## Notes
- Project resolution defaults to project name `Work Management`.
- Override project scope with env:
  - `WM_BACKLOG_ADMIN_PROJECT_ID`
  - `WM_BACKLOG_ADMIN_PROJECT_NAME`

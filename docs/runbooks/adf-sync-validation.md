# ADF Sync Validation Runbook

## Goal
Validate ADF connector sync against at least 3 real connected projects and capture pass/fail outcomes.

## Preconditions
- Work Management API is running and reachable.
- At least 3 projects have active `adf` connectors with valid `config.path`.
- Database has `connector`, `task`, `backlog_item`, and `project` tables migrated.

## Command
```bash
API_URL=http://localhost:3005/api \
SYNC_LIMIT=3 \
node scripts/adf-sync-validation.mjs
```

Optional scoped run:
```bash
API_URL=http://localhost:3005/api \
SYNC_PROJECT_IDS="<project-id-1>,<project-id-2>,<project-id-3>" \
node scripts/adf-sync-validation.mjs
```

## Expected Outcome
- Each selected project reports `PASS`.
- Non-zero `tasks` and/or `backlog` counts for active repos with artifacts.
- `status_synced=true` when `status.md` is present.

## Failure Triage
- `ADF connector not found`: create connector via `/api/connectors`.
- `Project path not configured`: update connector `config.path`.
- `source_id` conflict/upsert issues: inspect parser output and project-local artifact IDs.
- Parse mismatch: verify artifact naming (`tasks.md`, `backlog.md`/`BACKLOG.md`, `status.md`).

## Evidence to Capture
- Validation command output.
- Project IDs validated.
- Failures with root cause and remediation notes.

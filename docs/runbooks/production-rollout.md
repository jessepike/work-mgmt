# Production Rollout Runbook

## Purpose
Execute B31 production rollout with explicit, repeatable steps after preflight passes.

## Prerequisites
- Local branch is clean and pushed.
- `npm run qa:deploy-readiness` passes.
- Supabase access to the production project.
- Vercel access to the target project/environment.

## 1) Freeze + Backup Checkpoint
- Announce deploy window in team channel.
- Confirm latest DB backup/checkpoint is available.
- Record current production commit SHA and deployment URL.

## 2) Database Migration (Production)
- Link the prod Supabase project if needed:
```bash
supabase link --project-ref <prod-project-ref>
```
- Push migrations:
```bash
supabase db push
```
- Confirm there are no pending migration errors in output.

## 3) Vercel Environment Verification
- Ensure these are present in Vercel Production env:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL` (production domain)
- Confirm MCP runtime points to production API:
  - `API_URL=https://<production-domain>/api`

## 4) Deploy App
- Trigger production deploy (CLI or Git push):
```bash
vercel --prod
```
- Capture deployment URL and commit SHA.

## 5) Post-Deploy Validation
- Run contract smoke against production API base:
```bash
API_URL=https://<production-domain>/api npm run test:api-contract
```
- Run MCP smoke against production API:
```bash
API_URL=https://<production-domain>/api npm --prefix mcp-server run smoke:contract
API_URL=https://<production-domain>/api npm --prefix mcp-server run smoke:e2e
```
- Validate ADF sync on 3 active connectors:
```bash
API_URL=https://<production-domain>/api npm run test:adf-sync
```

## 6) Rollback (if needed)
- Redeploy last known-good Vercel release.
- If migration introduced breaking change, restore from checkpoint backup.
- Re-run post-deploy validation to confirm recovery.

## Completion Criteria
- Production app healthy.
- API/MCP smoke all pass.
- ADF sync validation passes for 3+ projects.
- Deployment notes recorded in `status.md` session log.

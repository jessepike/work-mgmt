---
type: "tasks"
project: "work-management"
current_phase: "6. Build"
updated: "2026-02-11"
---

## Handoff

| Field | Value |
|-------|-------|
| Phase | 6. Build |
| Status | In Progress |
| Next | 7. Verify |
| Blocker | None |

**Done this phase:**
- Query APIs implemented and integrated (`status`, `blockers`, `deadlines`, `search`, `whats-next`, `activity`).
- MCP parity aliases + missing read tools implemented.
- MCP smoke scripts added (contract + e2e) and CI workflow added.

**Next phase requires:**
- Seed/deploy hardening and connector validation prep.

---

# Active Tasks (Phase 6: Build)

| ID | Task | Status | Acceptance Criteria | Testing | Depends | Capability |
|----|------|--------|---------------------|---------|---------|------------|
| T14.1 | Implement Portfolio Status API | done | GET /api/projects/status returns aggregated health and task counts | curl test | - | backend |
| T14.2 | Implement Blockers API | done | GET /api/blockers returns list of blocked tasks with project context | curl test | - | backend |
| T14.3 | Implement Deadlines API | done | GET /api/deadlines returns upcoming deadlines across portfolio | curl test | - | backend |
| T14.4 | Verify B14 via MCP | done | MCP exposes and returns results for status/blockers/deadlines/search/activity tools | `npm --prefix mcp-server run smoke:contract` + `smoke:e2e` | T14.1-3 | mcp |
| T30.1 | Validate ADF sync against 3+ repos | done | `sync_adf_project` tested against 3 active repos; all passes logged in `BACKLOG.md` | `npm run test:adf-sync` | B18 | mcp |
| T31.1 | Deployment readiness checklist | pending | Env vars, migration sequence, and smoke gates documented | checklist review | B31 | ops |

# Completed Tasks

| ID | Task | Status | Completion Notes |
|----|------|--------|------------------|
| T23 | Align Project Structure with ADF | done | Moved status.md, linked brief.md, created adf/ artifacts. |

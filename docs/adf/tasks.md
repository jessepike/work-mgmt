---
type: "tasks"
project: "work-management"
current_phase: "6. Build"
updated: "2026-02-11"
---

## Handoff

| Field | Value |
|-------|-------|
| Phase | 5. Environment Setup |
| Status | Complete |
| Next | 6. Build |
| Blocker | None |

**Done this phase:**
- Environment verified on port 3005.
- Capability access (KB, Memory) registered.
- ADF artifacts aligned.

**Next phase requires:**
- Implementation of B14 query endpoints.

---

# Active Tasks (Phase 6: Build)

| ID | Task | Status | Acceptance Criteria | Testing | Depends | Capability |
|----|------|--------|---------------------|---------|---------|------------|
| T14.1 | Implement Portfolio Status API | done | GET /api/projects/status returns aggregated health and task counts | curl test | - | backend |
| T14.2 | Implement Blockers API | done | GET /api/blockers returns list of blocked tasks with project context | curl test | - | backend |
| T14.3 | Implement Deadlines API | done | GET /api/deadlines returns upcoming deadlines across portfolio | curl test | - | backend |
| T14.4 | Verify B14 via MCP | pending | Ensure adf-server (or custom tool) can expose these summaries | MCP debug | T14.1-3 | mcp |

# Completed Tasks

| ID | Task | Status | Completion Notes |
|----|------|--------|------------------|
| T23 | Align Project Structure with ADF | done | Moved status.md, linked brief.md, created adf/ artifacts. |

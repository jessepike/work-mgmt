---
project: "work-management"
stage: "Develop"
updated: "2026-02-11"
---

# Status

## Current State

- **Phase:** Develop — Backend/MCP implementation complete enough for UI integration
- **Focus:** UI build proceeds in parallel; backend remaining work is seed/deploy hardening and connector validation
- **Build:** MCP build and smoke checks passing (`smoke:contract`; `smoke:e2e` with data-dependent skip/strict mode)
- **API:** CRUD + cross-cutting query routes implemented, including activity filtering and real activity-based health signals
- **MCP:** Tool parity aligned to interface names with compatibility aliases and stdio transport
- **Known bugs:** None open in `BACKLOG.md`

## Recent Progress

- MCP parity completed:
  - Added canonical design aliases (`get_project`, `update_plan`, `update_phase`, `promote_backlog`, `search`, `whats_next`, `get_activity`, etc.)
  - Added missing `get_task` coverage
- Added MCP smoke tooling:
  - Contract check for required tool registration
  - E2E smoke for key query/mutation path with strict mode support
- Added backend CI workflow:
  - Push/PR contract smoke
  - Manual strict E2E dispatch support
- API hardening:
  - `/api/activity` now honors `entity_type` filter and validates parameters
  - Project health now uses real last activity (project + task events) in both list/detail endpoints

## Next Steps

- Complete seed data expansion (`B4`) for richer local/CI smoke coverage.
- Run and document ADF sync against 3+ repos (`B30`).
- Prepare deployment and env rollout checklist (`B31`).

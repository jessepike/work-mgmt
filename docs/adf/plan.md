---
type: "plan"
project: "work-management"
feature: "B14: Cross-cutting Query Endpoints"
stage: "Develop"
updated: "2026-02-11"
---

# B14: Query Endpoints Implementation Plan

## Goal
Implement remaining cross-cutting query endpoints to provide high-level visibility across the portfolio.

## Proposed Changes

### Portfolio Status API
#### [NEW] [status/route.ts](file:///Users/jessepike/code/_shared/work-management/src/app/api/projects/status/route.ts)
- Create `GET /api/projects/status`
- Logic:
    1. Fetch all active projects.
    2. Compute health for all projects (utilizing `computeProjectHealth`).
    3. Aggregate health stats (healthy, at_risk, unhealthy).
    4. Aggregate project statuses (active, on_hold, archived).
    5. Aggregate task counts across all projects (pending, in_progress, blocked, overdue).
    6. Identify top 5 closest deadlines across the portfolio.

### Blockers API
#### [NEW] [blockers/route.ts](file:///Users/jessepike/code/_shared/work-management/src/app/api/blockers/route.ts)
- Create `GET /api/blockers`
- Logic:
    1. Fetch all tasks with status `blocked`.
    2. Join or map with project info.
    3. Return list sorted by priority and deadline.

### Deadlines API
#### [NEW] [deadlines/route.ts](file:///Users/jessepike/code/_shared/work-management/src/app/api/deadlines/route.ts)
- Create `GET /api/deadlines`
- Logic:
    1. Fetch active tasks with `deadline_at IS NOT NULL`.
    2. Filter for "upcoming" (e.g., next 14 days).
    3. Sort by date.

## Verification Plan

### Automated Tests
- Create integration tests in `tests/api/queries.test.ts`
- Verify JSON schema and count accuracy.

### Manual Verification
- Test via `curl` or MCP tools (`whats_next`, `status`).

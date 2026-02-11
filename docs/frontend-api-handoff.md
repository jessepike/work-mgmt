---
type: "design-supporting"
project: "Work Management"
updated: "2026-02-11"
---

# Frontend API Handoff

## Scope
This handoff defines the current API contract for critical UI views:
- Portfolio list
- Project detail
- Task list
- What's next
- Portfolio status summary

Base URL (local): `http://localhost:3005/api`

## Stable Endpoints

### `GET /api/projects`
Returns:
```json
{ "data": [ProjectListItem] }
```
`ProjectListItem` includes project row fields plus:
- `health`: `green | yellow | red`
- `health_reason`: string
- `task_summary`: `{ pending, in_progress, blocked, total_active }`

### `GET /api/projects/:id`
Returns:
```json
{ "data": ProjectDetail }
```
`ProjectDetail` includes project row fields plus:
- `plans`: `Plan[]`
- `phases`: `Phase[]`
- `connector`: `null | { id, connector_type, status, last_sync_at }`
- `task_summary`: `{ pending, in_progress, blocked, done, total }`
- `active_blockers`: `Array<{ id, title, blocked_reason }>`
- `current_plan`: `null | Plan`
- `health`, `health_reason`

### `GET /api/tasks`
Returns:
```json
{ "data": [TaskWithRefs] }
```
`TaskWithRefs` includes task row fields plus joined refs:
- `project: { id, name }`
- `owner: { name } | null`

### `GET /api/whats-next`
Returns:
```json
{ "data": [RankedTask] }
```
`RankedTask` is task-like data plus:
- `score`: number
- `match_reasons`: string[]

### `GET /api/projects/status`
Returns:
```json
{
  "data": {
    "total_projects": number,
    "by_status": { "active": number, "on_hold": number, "archived": number },
    "by_health": { "healthy": number, "at_risk": number, "unhealthy": number },
    "task_summary": { "pending": number, "in_progress": number, "blocked": number, "overdue": number, "total_active": number },
    "upcoming_deadlines": Array<{ project_id, project_name, task_id, deadline, health }>
  }
}
```

## Contract Quirks (UI Adapter Notes)
- `task_summary` shape differs:
  - `/projects` uses `total_active`
  - `/projects/:id` uses `total` and includes `done`
- `/api/projects/status.by_status.on_hold` maps from DB status `paused`.
- All endpoints use `{ data: ... }` envelope for UI-critical reads.

## Enums Used by UI
- `project.status`: `active | paused | completed | archived`
- `project.health`: `green | yellow | red`
- `task.status`: `pending | in_progress | blocked | done`
- `task.priority`: `P1 | P2 | P3`
- `plan.status`: `draft | approved | in_progress | completed`
- `phase.status`: `pending | active | completed`

## Verification Script
Run contract smoke test against a running API server:
```bash
node tests/api-contract-smoke.mjs
```

Optional custom API URL:
```bash
API_BASE_URL=http://localhost:3005/api node tests/api-contract-smoke.mjs
```

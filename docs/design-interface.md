---
type: "design-supporting"
parent: "./design.md"
project: "Work Management"
version: "0.1"
created: "2026-02-10"
updated: "2026-02-10"
---

# Interface: Work Management

## REST API

### Common Patterns

**Base URL:** `/api`

**Authentication:** Bearer JWT in `Authorization` header. Dashboard uses cookie-based session (same JWT, different transport).

**Pagination:** `?limit=50&offset=0` (default limit: 50, max: 200)

**Filtering:** Query parameters per endpoint. Arrays via comma-separated values: `?categories=dev,business`

**Sorting:** `?sort=created_at&order=desc` (default varies by endpoint)

**Response envelope:**

```json
{
  "data": { ... },
  "meta": { "total": 42, "limit": 50, "offset": 0 }
}
```

Single entity responses omit `meta`. Mutation responses return the updated entity in `data`.

### Validation Rules (API-enforced)

These rules are enforced server-side on every mutation:

**Workflow type constraints:**
- `workflow_type = flat`: Tasks must have `plan_id = null` AND `phase_id = null`. Reject with 400 otherwise.
- `workflow_type = planned`: Tasks must have `plan_id` set (non-null). `phase_id` is optional. Reject with 400 if `plan_id` is null.

**Data origin enforcement:**
- Mutations (POST, PATCH, DELETE) on entities with `data_origin = 'synced'` return `403` with error code `SYNCED_ENTITY_READONLY`.
- Exception: project-level annotations (health_override, tags, categories) can be modified for connected projects.
- Connector-originated requests (identified by service role + actor context) bypass this rule.

**source_id enforcement:**
- When `data_origin = 'synced'`, `source_id` is required. Reject with 400 if null.
- When `data_origin = 'native'`, `source_id` must be null.

### Endpoint Contracts

#### Projects

**GET /api/projects**
Query: `?status=active&categories=dev,business&health=red,yellow&tags=urgent`
Returns: Project[] with computed health (or override), task count summary

**GET /api/projects/:id**
Returns: Full project detail with:
- Computed health (or override)
- Task counts by status (`{ pending: 3, in_progress: 2, blocked: 1, done: 8 }`)
- Active blockers
- Current plan (if planned workflow)

**POST /api/projects**
Body: `{ name, project_type, categories, workflow_type, owner_id, ...optional fields }`
Returns: Created project
Side effect: ActivityLog entry (`created`)

**PATCH /api/projects/:id**
Body: Partial project fields
Returns: Updated project
Side effect: ActivityLog entry (`updated` or `status_changed`)

**DELETE /api/projects/:id**
Behavior: Sets `status = 'archived'` (soft delete)
Side effect: ActivityLog entry (`archived`)

#### Plans

**GET /api/projects/:id/plans**
Returns: Plan[] for project

**POST /api/projects/:id/plans**
Body: `{ name, description? }`
Validation: Project must have `workflow_type = 'planned'`
Returns: Created plan (status: draft)

**PATCH /api/plans/:id**
Body: Partial plan fields

**POST /api/plans/:id/approve**
Body: `{ approved_by }`
Behavior: Sets `status = 'approved'`, records `approved_at` and `approved_by`

#### Phases

**GET /api/plans/:id/phases**
Returns: Phase[] sorted by `sort_order`

**POST /api/plans/:id/phases**
Body: `{ name, sort_order, description?, deadline_at? }`

**PATCH /api/phases/:id**
Body: Partial phase fields

#### Tasks

**GET /api/tasks**
Query: `?project_id=&phase_id=&status=pending,in_progress&priority=P1&owner_id=&deadline_before=&deadline_after=`
Returns: Task[] with project name included

**GET /api/tasks/:id**
Returns: Full task detail with recent activity entries

**POST /api/tasks**
Body: `{ project_id, title, plan_id?, phase_id?, ...optional fields }`
Validation: Workflow type constraints (see above)
Side effect: display_id auto-assigned via trigger, ActivityLog entry

**PATCH /api/tasks/:id**
Body: Partial task fields
Validation: Data origin enforcement
Side effect: ActivityLog entry (detects status changes)

**POST /api/tasks/:id/complete**
Behavior: Sets `status = 'done'`, records `completed_at`
Side effect: ActivityLog entry (`status_changed`)

**POST /api/tasks/:id/validate**
Body: `{ validation_status: 'passed' | 'failed', validated_by, outcome? }`
Behavior: Updates validation fields
Side effect: ActivityLog entry (`validated`)

#### Backlog

**GET /api/projects/:id/backlog**
Query: `?status=captured,triaged&priority=P1`
Returns: BacklogItem[]

**POST /api/projects/:id/backlog**
Body: `{ title, description?, type?, priority?, captured_via? }`

**PATCH /api/backlog/:id**
Body: Partial backlog fields
Validation: Data origin enforcement

**POST /api/backlog/:id/promote**
Body: `{ plan_id?, phase_id? }` (required for planned projects)
Behavior: Creates Task from BacklogItem, sets backlog `status = 'promoted'`, links via `promoted_to_task_id`
Validation: For planned projects, `plan_id` required
Side effect: ActivityLog entries on both entities

#### Cross-Cutting Queries

**GET /api/status**
Query: `?project_id=` (optional — omit for portfolio-level)
Returns: Summary with project counts by health, task counts by status, active blockers

**GET /api/whats-next**
Query: `?limit=10`
Returns: Prioritized tasks using the ranking algorithm:
1. Filter: active tasks (pending/in_progress), exclude blocked
2. Partition by deadline bucket: Overdue → Today → This Week → Next Week → No Deadline
3. Within bucket: sort by priority (P1 → P2 → P3 → unset)
4. Within priority: sort by project health (red → yellow → green)
5. Cap at limit (default 10)

**GET /api/blockers**
Query: `?project_id=` (optional)
Returns: Blocked tasks with context (blocked_reason, project name, how long blocked)

**GET /api/deadlines**
Query: `?window=7d` (default: 7 days)
Returns: Tasks with deadlines, grouped by bucket (overdue, today, this week, next week)

**GET /api/search**
Query: `?q=keyword&entity_types=task,backlog_item`
Behavior: Full-text search across title + description using Postgres FTS
Returns: Mixed entity results with type tag and relevance score

**GET /api/activity**
Query: `?entity_type=task&entity_id=&actor_id=&after=&before=&limit=50`
Returns: ActivityLog entries, newest first

#### Connectors

**GET /api/connectors**
Returns: Connector[]

**POST /api/connectors**
Body: `{ connector_type, project_id, config }`

**POST /api/connectors/:id/sync**
Behavior: Triggers sync (used by internal MCP tool, not typically called directly)

## MCP Adapter

### Transport

stdio (local process). Configured in Claude Desktop's `claude_desktop_config.json`.

### Tool Definitions

Tools map 1:1 to REST endpoints. Each tool documents its parameters and return shape.

**CRUD Tools:**

| Tool | Maps To | Key Parameters |
|------|---------|---------------|
| `list_projects` | GET /api/projects | status?, categories?, health? |
| `get_project` | GET /api/projects/:id | project_id |
| `create_project` | POST /api/projects | name, project_type, categories, workflow_type, owner_id |
| `update_project` | PATCH /api/projects/:id | project_id, ...fields |
| `list_tasks` | GET /api/tasks | project_id?, status?, priority? |
| `get_task` | GET /api/tasks/:id | task_id |
| `create_task` | POST /api/tasks | project_id, title, plan_id?, phase_id? |
| `update_task` | PATCH /api/tasks/:id | task_id, ...fields |
| `complete_task` | POST /api/tasks/:id/complete | task_id |
| `validate_task` | POST /api/tasks/:id/validate | task_id, validation_status, validated_by |
| `list_backlog` | GET /api/projects/:id/backlog | project_id |
| `create_backlog_item` | POST /api/projects/:id/backlog | project_id, title |
| `promote_backlog` | POST /api/backlog/:id/promote | backlog_id, plan_id?, phase_id? |

**Query Tools:**

| Tool | Maps To | Key Parameters |
|------|---------|---------------|
| `get_status` | GET /api/status | project_id? |
| `whats_next` | GET /api/whats-next | limit? |
| `get_blockers` | GET /api/blockers | project_id? |
| `get_deadlines` | GET /api/deadlines | window? |
| `search` | GET /api/search | query, entity_types? |
| `get_activity` | GET /api/activity | entity_type?, entity_id?, limit? |

**Connector Tool:**

| Tool | Maps To | Key Parameters |
|------|---------|---------------|
| `sync_project` | Internal | repo_path, connector_type? |

`sync_project` is special — it doesn't call a REST endpoint directly. It:
1. Reads ADF files from `repo_path`
2. Parses them into entity shapes
3. Calls REST API endpoints to upsert (using source_id for matching)
4. Returns sync summary: `{ synced: N, failed: M, errors: [...] }`

## Dashboard

### Design System

- **Aesthetic:** Dark mode, Zed IDE-inspired (validated in Stitch prototyping)
- **Framework:** Tailwind CSS 4
- **Colors:** Muted, desaturated — backgrounds nearly merge, status colors as whispers (brick, olive, ochre, terracotta)
- **Typography:** Monospace-influenced, high readability
- **Density:** Compact, information-dense (Todoist-level)

Design tokens and component patterns documented in Stitch prototyping (archived in `docs/_archive/2026-02-10-stitch-prompt.md`).

### View Routing

| Route | View | Default |
|-------|------|---------|
| `/` | Today | Yes |
| `/portfolio` | Portfolio | |
| `/projects/:id` | Project Detail | |
| `/projects/:id/kanban` | Status Kanban | |
| `/projects/:id/priority` | Priority Board | |
| `/projects/:id/deadlines` | Deadline View | |

### View Specifications

**Today View** (`/`)
- Calls `/api/whats-next` for prioritized task list
- Groups by deadline bucket (overdue, today, this week, etc.)
- Each item shows: task title, project name, priority chip, deadline
- Click → navigates to project detail with task selected

**Portfolio View** (`/portfolio`)
- Calls `/api/projects?status=active`
- Project cards: name, health indicator, categories, task summary (N pending, M blocked), focus
- Filter bar: category, health, status
- Click card → project detail
- Create project button → modal

**Project Detail** (`/projects/:id`)
- Adaptive layout based on `workflow_type`:
  - **Flat:** Task list, grouped by status
  - **Planned:** Phase accordion → task list within each phase
- Sidebar: project metadata, health, blockers, pending decisions
- Backlog section (collapsible)
- Connected projects: sync status indicator, last sync time, read-only badge on synced items
- Quick-add: title input + Enter, optional field expansion

**Status Kanban** (`/projects/:id/kanban`)
- Columns: Pending → In Progress → Blocked → Done
- Task cards with priority chip, owner, deadline
- Drag-and-drop reorder within columns (native projects only, updates sort_order)
- Drag between columns updates status

**Priority Board** (`/projects/:id/priority`)
- Columns: P1 → P2 → P3 → Unset
- Same card format as kanban

**Deadline View** (`/projects/:id/deadlines`)
- Groups: Overdue → Today → This Week → Next Week → Later → No Deadline
- Sorted chronologically within each group

### Interaction Patterns

**Task selection → Detail panel:**
- Click task in any view → slide-out panel from right
- Panel shows all task fields, activity log, inline editing
- Edit fields inline (click to edit, blur to save)
- Close panel → returns to list

**Quick-add:**
- Always-visible input at top of task list
- Type title + Enter → creates task (pending, no priority)
- Optional: expand to set priority, owner, deadline before creating

**Drag-and-drop:**
- Native projects only (synced items show read-only indicator)
- Kanban: between columns (status change) and within columns (reorder)
- Updates `sort_order` and/or `status` via PATCH

**Sync status indicators:**
- Connected projects show "Synced via ADF" badge
- Last sync timestamp
- Synced items have subtle indicator (no edit affordances)

### Component Inventory

| Component | Usage |
|-----------|-------|
| ProjectCard | Portfolio view, compact project summary |
| TaskCard | Kanban columns, list items |
| TaskDetailPanel | Slide-out panel with full task fields |
| FilterBar | Category, status, priority, health filters |
| QuickAdd | Title input for rapid task creation |
| HealthBadge | Green/yellow/red indicator |
| PriorityChip | P1/P2/P3 colored chip |
| StatusColumn | Kanban column container |
| PhaseAccordion | Collapsible phase section in project detail |
| BacklogSection | Collapsible backlog list |
| SyncIndicator | Connected project sync status |
| ViewSwitcher | Route-based view navigation |
| Modal | Create project, confirmations |
| Toast | Success/error notifications |
| EmptyState | "No tasks yet" / "No blockers" messaging |

### Dashboard Data Flow

```
Server Components (initial load)
  → Fetch data via Supabase server client
  → Render initial HTML

Client Components (interactivity)
  → Mutations via fetch() to /api/* routes
  → Optimistic updates where appropriate
  → Revalidate server data after mutations
```

No separate state management library. React Server Components for reads, client components with `fetch` for writes, Next.js `revalidatePath` for cache invalidation.

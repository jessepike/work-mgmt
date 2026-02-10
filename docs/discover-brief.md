---
type: "brief"
project: "Work Management"
version: "0.4"
status: "external-review-complete"
review_cycle: 3
created: "2026-02-10"
updated: "2026-02-10"
intent_ref: "./intent.md"
---

# Brief: Work Management

## Classification

- **Type:** App
- **Scale:** personal
- **Scope:** mvp
- **Complexity:** multi-component

## Summary

Work Management is the central system of record for all work across every domain — development, business, consulting, board, and personal. It is the execution spine of the Agentic Work System Architecture, operating at the Management layer. It stores, structures, and serves project and task data through a REST API, MCP adapter, ADF connector, and visual dashboard. It is agent-first (primarily consumed by LLM agents) and human-accessible (dashboard for visibility and native project management). Work Management is architecturally independent — a peer to ADF and Krypton, not subordinate to either. See intent.md for the North Star.

## System Identity

Work Management has two components:

| Component | What It Is | MVP Status |
|-----------|-----------|------------|
| **The Store** | Data layer + API. System of record. "Dumb" infrastructure — tracks state, serves queries. | In scope |
| **Work Manager Agent** | LLM agent with operational intelligence. Oversees the store. Eventually taps KB/memory for reasoning. | Out of scope — layered on after MVP |

Work Management serves two modes:

| Mode | Applies To | Data Flow |
|------|-----------|-----------|
| **Aggregator** | Connected projects (ADF repos, future: Linear, GitHub) | External → Connector → SoR (inbound-only for MVP) |
| **Primary SoR** | Native projects (no external system) | Dashboard / API → SoR |

Both modes produce the same entity shapes and are queryable through the same API.

### What Work Management Is NOT

- Not an AI agent or orchestrator (that's the Work Manager agent, then Krypton)
- Not a communication platform (future Krypton responsibility)
- Not a knowledge base (separate system — KB MCP server)
- Not a development process framework (that's ADF)
- Not a strategic reasoning engine (that's Krypton)

### Boundary Rules (from Agentic Work System Architecture)

| Function | Owner |
|----------|-------|
| Tracking work state (what exists, what's done) | Work Management |
| Directing agents to execute tasks | Work Management (via Work Manager agent, post-MVP) |
| Deciding what to work on (strategic prioritization) | Krypton + Human (post-MVP) |
| Understanding why work matters | Krypton (post-MVP) |
| How dev projects progress through stages | ADF |
| Validating quality of outputs | Cross-cutting agent teams |
| Learning from completed work | Cross-cutting agent teams + KB/Memory |

## Work Lifecycle

All work flows through a universal lifecycle:

```
CAPTURE → PLAN → EXECUTE → VALIDATE → COMPLETE
```

| Stage | Description |
|-------|------------|
| **Capture** | Work enters the system — via API, dashboard, or connector sync. Lands in backlog. |
| **Plan** | Work is decomposed into phases/tasks with acceptance criteria. Promoted from backlog. |
| **Execute** | Tasks are worked — by agents or humans. Status tracked. |
| **Validate** | Completion verified against acceptance criteria. "Done" ≠ "validated." |
| **Complete** | Work confirmed done. Activity logged. Outcomes recorded. |

## Data Hierarchy

```
Portfolio (all projects, filterable by category/tags)
└── Project (one body of work)
    ├── Categories / Tags (dev, business, personal, board, consulting, +custom)
    ├── Backlog (unpromoted work queue)
    └── Plan (approved implementation approach — optional)
        └── Phase (milestone-level grouping — optional)
            └── Task (atomic work unit)
    └── [Flat] Task (when no plan/phases needed)
```

### Key Rules

- **Hierarchy is flexible per project.** Some use plans with phases, some are flat (Project → Tasks).
- **Backlog is always at the project level.** Captured, triaged, prioritized — not yet promoted.
- **Plans are optional.** Required for complex work, unnecessary for simple projects.
- **Phases are optional within plans.** Used when work has natural milestones.
- **Tasks are atomic.** Completable in bounded effort by one agent in one session.

## Entity Model

### Tech Stack

- **Database:** Supabase (Postgres)
- **API:** REST (Next.js API routes or standalone)
- **MCP Adapter:** Thin wrapper translating MCP tool calls → REST
- **Dashboard:** React / Next.js
- **Connector:** ADF markdown sync (MVP)

### Architecture

```
Supabase (Postgres)
    │
    ▼
REST API (business logic, validation, auth)
    │
    ├──▶ MCP Server (thin adapter — MCP tool calls → REST)
    │       └── Claude Desktop, other MCP-compatible agents
    │
    ├──▶ Dashboard (React/Next.js — calls REST directly)
    │
    ├──▶ Connectors (ADF markdown sync — push via REST)
    │
    └──▶ Future: Work Manager agent, Krypton, any REST client
```

### Entities

#### Project

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| name | string | Yes | |
| description | text | No | |
| project_type | enum | Yes | `connected` / `native` |
| categories | text[] | Yes | At least one. Starter: dev, business, personal, board, consulting |
| tags | text[] | No | Freeform |
| health | enum | Yes | `green` / `yellow` / `red` |
| health_reason | text | No | Auto-populated or manual |
| status | enum | Yes | `active` / `paused` / `completed` / `archived` |
| focus | text | No | Current focus area |
| workflow_type | enum | Yes | `flat` (project → tasks) / `planned` (project → plan → phases → tasks) |
| connector_id | uuid | No | FK to Connector if connected |
| current_stage | string | No | Connected dev projects only (discover/design/develop/deliver) |
| current_phase_id | uuid | No | Active phase if phases exist |
| blockers | text[] | No | Active blockers |
| pending_decisions | text[] | No | Decisions awaiting input |
| owner_id | string | Yes | FK to ActorRegistry |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |

#### Plan (NEW — first-class entity)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| project_id | uuid | Yes | FK |
| name | string | Yes | |
| description | text | No | Approach summary |
| status | enum | Yes | `draft` / `approved` / `in_progress` / `completed` |
| approved_at | timestamp | No | When human approved the plan |
| approved_by | string | No | FK to ActorRegistry |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |

**Decision rationale:** Plan is a first-class entity rather than implicit in phase/task structure. Plans represent approved implementation approaches — they have their own lifecycle (draft → approved → in_progress → completed) and are the boundary between "what we might do" (backlog) and "what we're committed to doing" (tasks).

**Plan usage rules:**
- **Flat projects** (`workflow_type = flat`): No plan needed. Tasks belong directly to the project. Suitable for simple, ongoing work (e.g., personal tasks, single-domain consulting).
- **Planned projects** (`workflow_type = planned`): Plan required. Tasks belong to phases within a plan. Suitable for complex, multi-phase work (e.g., ADF dev projects, large initiatives).
- **One active plan per project at a time.** Completed plans are archived. A new plan can be created for the next body of work.
- **Connected projects:** The connector creates/updates the plan structure based on the source system's organization (e.g., ADF stages → phases).

**API validation rules (enforced server-side):**
- `workflow_type = flat`: Tasks must have `plan_id = null` and `phase_id = null`. Reject task creation with plan/phase references.
- `workflow_type = planned`: Tasks must have `plan_id` set (non-null). `phase_id` is optional (plan may not use phases). Reject task creation without `plan_id`.
- Backlog promotion (`POST /api/backlog/:id/promote`): For planned projects, request body must include `plan_id` (and optionally `phase_id`). For flat projects, no plan/phase params needed.

#### Phase (optional, belongs to Plan)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| plan_id | uuid | Yes | FK |
| project_id | uuid | Yes | FK (denormalized for queries) |
| name | string | Yes | |
| description | text | No | |
| sort_order | int | Yes | Display/execution sequence |
| status | enum | Yes | `pending` / `active` / `completed` |
| handoff_notes | text | No | Context from previous phase |
| deadline_at | timestamp | No | |
| started_at | timestamp | No | |
| completed_at | timestamp | No | |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |

#### Task

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| project_id | uuid | Yes | FK (denormalized) |
| plan_id | uuid | No | FK. Null for unplanned tasks. |
| phase_id | uuid | No | FK. Null for flat projects/plans. |
| source_id | string | No | Original ID from connected system |
| title | string | Yes | Short, actionable |
| description | text | No | Extended detail |
| status | enum | Yes | `pending` / `in_progress` / `blocked` / `done` |
| validation_status | enum | No | `not_validated` / `passed` / `failed` |
| validated_by | string | No | FK to ActorRegistry — who validated |
| validated_at | timestamp | No | When validation occurred |
| priority | enum | No | `P1` / `P2` / `P3` |
| size | enum | No | `S` / `M` / `L` |
| owner_type | enum | No | `human` / `agent` |
| owner_id | string | No | FK to ActorRegistry |
| deadline_at | timestamp | No | |
| blocked_reason | text | No | |
| depends_on | uuid[] | No | Linked task IDs |
| acceptance_criteria | text | No | What "done" looks like |
| outcome | text | No | What actually happened (filled at completion) |
| sort_order | int | No | Position within status column. Enables drag-and-drop reordering. |
| notes | text | No | |
| data_origin | enum | Yes | `synced` / `native` |
| completed_at | timestamp | No | |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |

**Validation properties (NEW):** Tasks now distinguish between `done` (status) and `validated` (validation_status). A task can be done but not yet validated against its acceptance criteria. The `outcome` field captures what actually happened, enabling comparison against acceptance_criteria.

#### BacklogItem

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| project_id | uuid | Yes | FK |
| source_id | string | No | Original ID from connected system |
| title | string | Yes | |
| description | text | No | |
| type | string | No | bug, enhancement, idea, maintenance, improvement |
| component | string | No | What part of the project |
| priority | enum | No | `P1` / `P2` / `P3` |
| size | enum | No | `S` / `M` / `L` |
| status | enum | Yes | `captured` / `triaged` / `prioritized` / `promoted` / `archived` |
| promoted_to_task_id | uuid | No | When graduated to active work |
| captured_via | string | No | Channel: `api`, `dashboard`, `connector` |
| notes | text | No | |
| data_origin | enum | Yes | `synced` / `native` |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |

**Backlog lifecycle (refined):** `captured` → `triaged` → `prioritized` → `promoted` (to task) or `archived`.

#### ActivityLog (append-only)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| entity_type | enum | Yes | `project` / `plan` / `phase` / `task` / `backlog_item` |
| entity_id | uuid | Yes | FK |
| actor_type | enum | Yes | `human` / `agent` / `system` / `connector` |
| actor_id | string | Yes | FK to ActorRegistry |
| action | string | Yes | `created`, `status_changed`, `validated`, `promoted`, `synced`, etc. |
| detail | jsonb | No | Old/new values, context |
| timestamp | timestamp | Yes | |

**Design for future migration:** Activity events are structured with enough fidelity to migrate to an append-only ledger (DOLT/Datomic) later. Never delete. Always include timestamp and actor.

#### ActorRegistry

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | string | Yes | PK (e.g., "jess", "claude-code") |
| name | string | Yes | Display name |
| type | enum | Yes | `human` / `agent` |
| active | boolean | Yes | |
| capabilities | text[] | No | What this actor can do |

#### Connector

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | uuid | Yes | PK |
| connector_type | string | Yes | `adf_markdown` (MVP) / `linear` / `github` (future) |
| project_id | uuid | Yes | FK — which project this feeds |
| config | jsonb | Yes | Connection details (repo path, etc.) |
| field_mapping | jsonb | No | How external fields map to WM entities |
| sync_frequency | enum | No | `on_demand` / `on_commit` / `hourly` / `daily` |
| last_sync_at | timestamp | No | |
| status | enum | Yes | `active` / `paused` / `error` |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |

## Status Values and Health Model

### Task Status Lifecycle (status field)

```
pending ──▶ in_progress ──▶ done
   │             │
   │             ▼
   └────▶   blocked ───▶ pending (unblocked)
```

### Validation Lifecycle (validation_status field — orthogonal to status)

Validation is a **separate dimension** from task status. A task's validation_status is only relevant once status = `done`.

```
(status = done) ──▶ not_validated ──▶ passed
                                  ──▶ failed ──▶ (status reopened to in_progress for rework)
```

| Value | Meaning |
|-------|---------|
| `not_validated` | Default. Task done but not yet checked against acceptance criteria. |
| `passed` | Acceptance criteria confirmed met. Task is truly complete. |
| `failed` | Acceptance criteria not met. Task should be reopened for rework. |

### Project Health (auto-computed with manual override)

| Health | Logic |
|--------|-------|
| Green | No blocked tasks. No overdue deadlines. Active progress in last 7 days. |
| Yellow | Has blocked tasks OR deadlines within 48h OR no progress in 7+ days. |
| Red | Has overdue deadlines OR >30% tasks blocked OR no progress in 14+ days. |

## API Surface

### REST API Endpoints

#### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects (filter by category, health, status, tags) |
| GET | `/api/projects/:id` | Project detail with task counts, blockers |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Archive project (soft delete) |

#### Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/plans` | List plans for a project |
| POST | `/api/projects/:id/plans` | Create plan |
| PATCH | `/api/plans/:id` | Update plan |
| POST | `/api/plans/:id/approve` | Approve plan |

#### Phases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/plans/:id/phases` | List phases for a plan |
| POST | `/api/plans/:id/phases` | Create phase |
| PATCH | `/api/phases/:id` | Update phase |

#### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (filter by project, phase, status, priority, owner) |
| GET | `/api/tasks/:id` | Task detail |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |
| POST | `/api/tasks/:id/complete` | Mark done |
| POST | `/api/tasks/:id/validate` | Record validation result |

#### Backlog
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/backlog` | List backlog items |
| POST | `/api/projects/:id/backlog` | Create backlog item |
| PATCH | `/api/backlog/:id` | Update backlog item |
| POST | `/api/backlog/:id/promote` | Promote to task |

#### Queries (read-only, cross-cutting)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/status` | Portfolio or scoped status summary |
| GET | `/api/whats-next` | Prioritized next actions across projects |
| GET | `/api/blockers` | All blocked items with context |
| GET | `/api/deadlines` | Deadline-relative queries |
| GET | `/api/search` | Freeform search across entities |
| GET | `/api/activity` | Activity log (filter by entity, actor, date range) |

#### Connectors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/connectors` | List connectors |
| POST | `/api/connectors` | Register connector |
| POST | `/api/connectors/:id/sync` | Trigger sync |

### Data Origin Enforcement (API-level)

Entities with `data_origin = synced` are read-only through the REST API. Mutating requests (POST, PATCH, DELETE) targeting synced entities must return `403 Forbidden` with an error indicating the entity is managed by its source system. Only the connector can create/update synced entities. This is enforced at the API layer, not just the UI.

**Exception:** Work Management annotations (project-level metadata like health, tags, categories) can be modified for connected projects. Only source-system-owned fields (task status, title, description, etc.) are protected.

### MCP Adapter

Thin layer mapping MCP tool calls 1:1 to REST endpoints. Provider-agnostic — any MCP-compatible client can connect.

## ADF Connector (MVP)

### Design

- **Direction:** Inbound-only. ADF repos → Work Management. No write-back.
- **Mechanism:** Push-based script triggered at agent session end or on git commit
- **Parsing:** Strict — ADF specs are the contract
- **One connector per project**

### Mapping

| ADF Artifact | Parses To |
|-------------|-----------|
| status.md | Project fields: current_stage, focus, blockers, pending_decisions |
| tasks.md active section | Task entities |
| tasks.md completed section | Completed tasks with dates |
| backlog.md queue | BacklogItem entities |
| backlog.md archive | Archived backlog items |

### Future Connectors (backlogged)

| Connector | Priority |
|-----------|----------|
| Linear | High |
| GitHub Issues/Projects | Medium |
| Notion | Medium |

## Dashboard

### Design Philosophy

- **View-switching first.** Dropdown to slice data by different dimensions.
- **Clean and minimal.** Todoist-level simplicity.
- **Agent-first awareness.** Connected projects show sync status.
- **Desktop-primary.** Mobile is nice-to-have.

### MVP Views (switchable via dropdown)

| View | Slice By | Shows |
|------|----------|-------|
| **Today** | Cross-project priorities + deadlines | "What should I work on?" — ranked by algorithm below |
| **Portfolio** | All projects | Project cards: name, health, categories, task summary, blockers |
| **Project Detail** | Single project | Tasks (kanban or list), backlog, phases if applicable |
| **Status Kanban** | Task status | To Do / Doing / Blocked / Done |
| **Priority Board** | Priority level | P1 / P2 / P3 |
| **Deadline View** | Time pressure | Overdue / Today / This Week / Next Week / Later |

### "What's Next" Prioritization Algorithm

The Today view and `/api/whats-next` endpoint use the same ranking logic:

1. **Filter:** Active tasks only (`in_progress` or `pending`). Exclude blocked.
2. **Partition by deadline bucket:** Overdue → Today → This Week → Next Week → No Deadline
3. **Within each bucket:** Sort by priority (P1 → P2 → P3 → unset)
4. **Within same priority:** Sort by project health (red → yellow → green) — troubled projects surface first
5. **Cap:** Return top 8-12 items across all projects

Blocked tasks are excluded from "what's next" but appear in the dedicated Blockers query. This is operational sorting only — no strategic reasoning about "what matters most." That intelligence comes from the Work Manager agent (post-MVP) and eventually Krypton.

### MVP Screens

| Screen | Function |
|--------|----------|
| Portfolio Dashboard | Project cards, filter bar, create project |
| Project Detail | Adaptive layout (flat vs phases), backlog, sync indicator |
| Task Kanban | Cards by status, drag-and-drop (native only) |
| Task Detail | Slide-out panel with all fields, activity log, inline edit |
| Quick-Add | Title + Enter, optional expansion |

### Out of Scope (MVP)

- User management / permissions
- Real-time collaboration
- Custom view builder
- Recurring task templates
- Command bar (post-MVP)
- Advanced charts / reporting
- Native mobile app

## Digest Engine (Post-MVP)

The digest engine is deferred to post-MVP. The Today view and cross-cutting query endpoints (`/api/whats-next`, `/api/blockers`, `/api/deadlines`) provide the core "what should I work on?" capability. Digest generation (daily/weekly summaries for async consumption) becomes valuable when Krypton exists to deliver them via channels (Discord, Telegram, etc.). Documented here for architectural reference.

### Daily Digest (post-MVP)

| Section | Logic |
|---------|-------|
| Tomorrow Focus (8-12 items) | Active tasks, deadline-sorted, then priority-sorted, cross-project |
| Deadline Risks (48h) | Tasks with deadline within 48h + blocked tasks |
| Blockers needing decision | Blocked tasks + pending decisions |
| Notable updates | Completions, status changes since last digest |

### Weekly Digest (post-MVP)

| Section | Logic |
|---------|-------|
| Wins (7 days) | Completions by category |
| This week's priorities | Upcoming deadlines + active high-priority |
| Decisions needed | Pending decisions + blocked items |
| At-risk projects | Health yellow/red |

## Implementation Sequencing

> Sequencing guidance, not a plan. Plan is produced in Design/Develop.

### Phase 1: Data Foundation
- Supabase schema (all entities)
- Actor registry seed (Jess + known agents)
- Seed 5-8 real projects (mix of connected/native)
- Basic CRUD validation

### Phase 2: REST API
- Full CRUD endpoints
- Cross-cutting query endpoints (status, whats-next, blockers, deadlines, search)
- Activity log auto-population
- Health auto-computation

### Phase 3: MCP Adapter
- MCP wrapper over REST API
- Wire to Claude Desktop
- Validate read + write operations

### Phase 4: ADF Connector
- Markdown parser for status.md, tasks.md, backlog.md
- Push-based sync script
- Test against real project repos

### Phase 5: Dashboard
- Portfolio view + project detail + today view
- Task kanban with drag-and-drop
- View switching (dropdown)
- Quick-add
- Connected project read-only display

### Post-MVP
- Work Manager agent (operational intelligence layer)
- KB/Memory integration for agent reasoning
- Additional connectors (Linear, GitHub)
- Bidirectional sync consideration
- Multi-user access
- Additional views (owner, category)
- Command bar
- Mobile responsiveness
- Krypton integration

## Scope

### In Scope

- Central system of record (Supabase/Postgres)
- Full entity model (Project, Plan, Phase, Task, BacklogItem, ActivityLog, ActorRegistry, Connector)
- REST API with CRUD + cross-cutting queries
- MCP adapter for agent access
- ADF markdown connector (inbound-only)
- Dashboard with view switching (Today, Portfolio, Project Detail, Status Kanban, Priority Board, Deadline)
- Drag-and-drop for native projects
- Health auto-computation
- Single-user auth (simplified)
- 5-8 seeded real projects

### Out of Scope

- Work Manager agent (post-MVP intelligence layer)
- Krypton integration
- KB/Memory access from Work Management
- Bidirectional sync (ADF write-back)
- Non-ADF connectors (Linear, GitHub, Notion)
- Multi-user access / permissions
- Strategic prioritization / reasoning
- Real-time collaboration
- Mobile app
- Command bar
- Custom view builder

## Success Criteria

- [ ] Can answer "what should I work on today?" across all projects via dashboard Today view
- [ ] Can answer the same question via MCP query from an agent
- [ ] 5-8 real projects loaded (mix of connected ADF + native)
- [ ] ADF connector successfully syncs tasks/status/backlog from at least 3 project repos
- [ ] Dashboard renders all MVP views with dropdown switching
- [ ] Native project CRUD works end-to-end (dashboard → API → database)
- [ ] Connected projects display as read-only with sync status
- [ ] Health auto-computes correctly for all projects
- [ ] Activity log captures all state changes with actor attribution

## Constraints

- **Single user for MVP.** Auth is simplified. Multi-user designed for but not implemented.
- **Inbound-only sync.** No write-back to connected systems.
- **Supabase free tier** initially — schema must work within limits.
- **Desktop-primary dashboard.** Responsive is nice-to-have.
- **No strategic reasoning.** MVP surfaces state — it doesn't recommend. Operational queries only (what's next by deadline/priority, not "what matters most").
- **Activity log, not ledger.** Postgres append-only table for now. Structured for future ledger migration.

## Agent Hierarchy (post-MVP reference)

Documented here for architectural alignment — not built in MVP.

| Agent | Role | Subordinate To |
|-------|------|---------------|
| **Work Manager** | Top-level WM agent. Owns execution spine. Cross-project state. Directs task execution. | Krypton (when built) |
| **Planning Agent** | Decomposes intent into phases/tasks per planning methodology. | Work Manager |
| **Backlog/Status Manager** | Maintains backlogs across projects. Ensures status stays current. | Work Manager |

Cross-cutting teams (Reviewer, Validator, Improver) are **not** owned by Work Management — they are shared services dispatched as needed.

## Organizational Planes (post-MVP reference)

| Plane | Analog | Human-Agent Ratio | Work Management Role |
|-------|--------|-------------------|---------------------|
| Intent (Board) | Board of Directors | 80/20 | None — Krypton's domain |
| Governance (Executive) | CEO/Exec team | 50/50 | Surfaces compliance data |
| Management (Middle) | Project management | 30/70 | **Primary operating layer** |
| Operations (Workers) | Individual contributors | 10/90 | Tracks execution state |

Ratios are an autonomy escalation roadmap — shift as trust builds.

## Open Questions

- [ ] **Naming:** "Work Management" is functional but generic. Better label TBD.
- [ ] **Dashboard hosting:** Vercel vs self-hosted
- [ ] **Supabase project:** New or reuse existing?
- [ ] **REST API auth:** Supabase auth, API keys, or JWT for single-user MVP?
- [ ] **ADF sync trigger:** Git hook vs agent session-end script vs manual
- [ ] **Task ID display format:** UUID internal, human-readable display (e.g., PROJECT-NNN)?
- [ ] **Plan entity granularity:** How detailed does the Plan entity need to be vs. letting phases/tasks carry the structure? (Partially addressed with usage rules — Design to refine.)

## Open Items from Architecture Sessions

These were flagged as needing work and should be addressed in Design:

- [ ] **Planning spec needed:** Standalone spec for Planning Agent operations and Plan artifact structure
- [ ] **Ledger/audit approach:** Current Postgres sufficient for MVP, but design activity_events for future ledger migration
- [ ] **Validation not yet fully modeled:** Acceptance criteria tracking, validation status, outcome recording — addressed in this brief's entity model but needs Design validation

## Issue Log

| # | Issue | Source | Impact | Priority | Status | Resolution |
|---|-------|--------|--------|----------|--------|------------|
| 1 | Digest in scope/success criteria but Digest Engine section says post-MVP | Ralph-Internal | High | High | Resolved | Removed digest from In Scope and Success Criteria. Digest Engine section already marked post-MVP. |
| 2 | `has_phases` on Project stale — phases belong to Plans now | Ralph-Internal | High | High | Resolved | Replaced with `workflow_type` enum (`flat` / `planned`) |
| 3 | Task status lifecycle diagram conflates status and validation_status | Ralph-Internal | High | High | Resolved | Split into two separate lifecycle diagrams with clear orthogonality |
| 4 | Plan entity lacks usage guidance — when required vs skipped? | Ralph-Internal | High | High | Resolved | Added Plan usage rules: flat vs planned projects, one active plan per project, connector behavior |
| 5 | Open Questions references digest schedule — premature for post-MVP | Ralph-Internal | Low | Low | Resolved | Removed digest schedule question |
| 6 | Digest engine not explicitly in Out of Scope list | Ralph-Internal | Low | Low | Open | Post-MVP designation clear in Digest Engine section; not blocking |
| 7 | workflow_type / plan_id / phase_id validation rules missing | Gemini + GPT + Kimi (3/3) | High | P1 | Resolved | Added API validation rules enforcing workflow_type constraints on task creation and backlog promotion |
| 8 | Task entity lacks sort_order for drag-and-drop | Kimi | High | P1 | Resolved | Added sort_order field to Task entity |
| 9 | Synced entity write protection rule undefined | GPT | High | P1 | Resolved | Added Data Origin Enforcement section — API-level 403 for mutating synced entities |
| 10 | Backlog promotion needs plan_id/phase_id params | Kimi | High | P1 | Resolved | Addressed in API validation rules (Fix #7) |
| 11 | Auth approach undefined — blocks MCP + actor attribution | GPT | High | P2 | Deferred | Already in Open Questions. Design to resolve. |
| 12 | Health computation signals imprecise | GPT + Kimi | Medium | P2 | Deferred | Design to specify canonical events and time windows |
| 13 | ActivityLog capture mechanism unspecified | GPT | Medium | P2 | Deferred | Design to choose API-level vs DB trigger |
| 14 | source_id handling for synced items unclear | Gemini | Medium | P2 | Deferred | Design to specify required vs optional for synced items |
| 15 | Supabase free tier constraints + ActivityLog growth | GPT | Medium | P2 | Deferred | Design/operational concern — validate scale with seeded data |

## Review Log

### Phase 1: Internal Review

**Cycle 1 — 2026-02-10**
**Issues Found:** 0 Critical, 4 High, 1 Low
**Actions Taken:**
- **Fixed (5 issues):** Removed digest from scope/criteria, replaced has_phases with workflow_type, split status/validation lifecycles, added Plan usage rules, removed premature digest question
**Outcome:** All High issues resolved. Proceeding to Cycle 2 re-review.

**Cycle 2 — 2026-02-10**
**Issues Found:** 0 Critical, 0 High, 1 Low
**Actions Taken:**
- **Logged only (1 issue):** Digest not in Out of Scope list (Low — clear in Digest Engine section)
**Outcome:** Stop conditions met. 0 Critical, 0 High. Brief ready for external review.

**Internal Review Summary:**
- **Cycles:** 2
- **Total Issues:** 4 High, 2 Low
- **Resolved:** 4 High, 1 Low
- **Open (Low):** 1

### Phase 2: External Review

**Cycle 1 — 2026-02-10**
**Models:** Gemini, GPT, Kimi (3 reviewers via external-review MCP)
**Issues Found:** 4 P1 (High), 5 P2 (Medium — deferred to Design)

**P1 Issues (resolved):**
- **#7** workflow_type / plan_id / phase_id validation rules missing (consensus 3/3) → Added API validation rules
- **#8** Task lacks sort_order for drag-and-drop (Kimi) → Added sort_order field
- **#9** Synced entity write protection undefined (GPT) → Added Data Origin Enforcement section
- **#10** Backlog promotion needs plan_id/phase_id params (Kimi) → Addressed in API validation rules

**P2 Issues (deferred to Design):**
- **#11** Auth approach undefined (GPT) — already in Open Questions
- **#12** Health computation signals imprecise (GPT + Kimi)
- **#13** ActivityLog capture mechanism unspecified (GPT)
- **#14** source_id handling for synced items unclear (Gemini)
- **#15** Supabase free tier constraints + ActivityLog growth (GPT)

**Outcome:** All P1 issues resolved. P2 issues logged and deferred to Design. No re-submission needed — consensus issues addressed, remaining items are implementation-level concerns appropriate for Design stage.

**External Review Summary:**
- **Cycles:** 1
- **Total Issues:** 4 P1, 5 P2
- **Resolved:** 4 P1
- **Deferred to Design:** 5 P2

## Decision Log

| Decision | Options Considered | Chosen | Rationale | Date |
|----------|-------------------|--------|-----------|------|
| Plan as first-class entity | Implicit in phase/task vs explicit entity | Explicit entity | Plans have own lifecycle (draft→approved→complete), represent commitment boundary between backlog and execution | 2026-02-10 |
| Validation properties on Task | Status only vs separate validation | Separate validation_status + outcome fields | "Done" ≠ "validated." Need to distinguish task completion from criteria verification. | 2026-02-10 |
| Backlog lifecycle | Simple status vs multi-stage | Multi-stage: captured→triaged→prioritized→promoted/archived | Reflects real workflow from capture to action | 2026-02-10 |
| Work Manager agent out of MVP | Include basic agent vs defer | Defer entirely | Start with infrastructure. Layer intelligence when KB/Memory/Krypton are ready. | 2026-02-10 |
| Inbound-only sync | Bidirectional vs inbound-only | Inbound-only | Simplifies MVP. Source systems own their data. Revisit post-MVP. | 2026-02-10 |

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-02-10 | Initial draft — crystallized from v5 brief + architecture sessions + exploration |
| 0.2 | 2026-02-10 | Internal review cycle 1 — fixed digest scope inconsistency, replaced has_phases with workflow_type, split status/validation lifecycles, added Plan usage rules |
| 0.3 | 2026-02-10 | Internal review cycle 2 — 0 Critical/High found. Internal review complete. |
| 0.4 | 2026-02-10 | External review — 4 P1 resolved (API validation rules, sort_order, data origin enforcement, backlog promotion params). 5 P2 deferred to Design. |

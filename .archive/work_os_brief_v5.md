# Work OS — Product Brief v5
updated: 2026-02-05
owner: Jess
status: draft

---

## 1) What this document is

Work OS is the **operational data layer** that stores, structures, and serves all project and task management data across every domain of Jess's work. It is a headless system of record with a visual dashboard and a standard API surface.

Work OS does not contain AI reasoning, agent logic, or communication channel management. Those responsibilities belong to **Krypton** (see: Krypton Platform Brief v1), which is Work OS's primary consumer. Work OS is one of Krypton's skills — its most important one — but it is architecturally independent. Any authorized client (Krypton, dashboard, future agents, integrations) can read and write via the API.

**This brief covers:**
- System identity and boundaries
- Data hierarchy and taxonomy
- Entity model and schema
- API surface (REST + MCP adapter)
- Connector architecture (inbound integrations)
- Dashboard UI/UX requirements
- Digest engine (data-side; delivery is Krypton's job)
- MVP scope and sequencing

**Related document:** Krypton Platform Brief v1 (the AI agent that operates on top of Work OS)

---

## 2) System identity

**Work OS is a project and task management system of record, primarily accessed by agents and secondarily by humans.**

It serves two modes:

| Mode | Applies to | Data flow | Example |
|---|---|---|---|
| **Aggregator** | Connected projects (dev systems, Linear, etc.) | External → Connector → SoR | Krypton dev project, AI Risk Tools |
| **Primary SoR** | Native projects (no external system) | Dashboard / API → SoR | Papa Dogs, TCDC, consulting, personal |

Both modes produce the same entity shapes and are queryable through the same API. Consumers don't need to know where data originated.

### What Work OS is NOT
- Not an AI agent (that's Krypton)
- Not a communication platform (Krypton handles channels)
- Not a knowledge base (separate system, accessed by Krypton via its own MCP)
- Not a development environment (ADF and dev tools remain separate)

---

## 3) Data hierarchy

```
Portfolio (all projects, filterable by category/tags)
└── Project (one body of work)
    ├── Categories / Tags (dev, business, personal, board, consulting, +custom)
    ├── Backlog (unpromoted work queue — potential, not yet planned)
    └── [Optional] Phase (milestone-level grouping)
        └── Task (atomic work unit)
    └── [Flat] Task (when no phases needed)
```

### Key rules

- **Hierarchy is flexible per project.** Some projects use phases, some are flat (Project → Tasks).
- **Backlog is always at the project level.** Captured, triaged, prioritized — but not promoted to active execution.
- **Phases are optional.** Used when work has natural milestones or stages. Not required.
- **Tasks are atomic.** Completable in bounded effort. Belong to a project and optionally to a phase.
- **Categories/Tags organize across domains.** Starter set: `dev`, `business`, `personal`, `board`, `consulting`. Custom tags allowed.

### Connected project mapping (ADF example)

| ADF Concept | Work OS Mapping |
|---|---|
| Stage (Discover/Design/Develop/Deliver) | Project metadata: `current_stage` |
| Phase (within a stage) | Phase entity (optional) |
| Task (atomic work) | Task entity |
| Backlog item | BacklogItem entity |
| status.md session state | Project status fields (focus, blockers, pending_decisions) |

Other connected systems (Linear, GitHub, etc.) would map their own concepts to the same Work OS entities via their respective connectors.

---

## 4) Entity model

### Tech stack
- **Database:** Supabase (Postgres)
- **API:** REST (Next.js API routes or standalone service)
- **MCP Adapter:** Thin wrapper translating MCP tool calls → REST API
- **Dashboard:** React / Next.js (custom-built)

### Architecture

```
Supabase (Postgres)
    │
    ▼
REST API (business logic, validation, auth)
    │
    ├──▶ MCP Server (thin adapter — MCP tool calls → REST)
    │       └── Claude Desktop, ChatGPT, Gemini, Krypton, other agents
    │
    ├──▶ Dashboard (React/Next.js — calls REST directly)
    │
    ├──▶ Connectors (ADF sync, future Linear/GitHub — push via REST)
    │
    └──▶ Future: any client that speaks REST
```

### Entities

#### Project

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | Yes | PK |
| name | string | Yes | |
| description | text | No | |
| project_type | enum | Yes | `connected` / `native` |
| categories | text[] | Yes | At least one. Starter: dev, business, personal, board, consulting |
| tags | text[] | No | Freeform additional tags |
| health | enum | Yes | `green` / `yellow` / `red` |
| health_reason | text | No | Auto-populated or manual explanation |
| status | enum | Yes | `active` / `paused` / `completed` / `archived` |
| focus | text | No | Current focus area |
| has_phases | boolean | Yes | Whether this project uses phase grouping |
| connector_id | uuid | No | If connected, references connector config |
| current_stage | string | No | Connected dev projects only (discover/design/develop/deliver) |
| current_phase_id | uuid | No | Active phase if phases exist |
| blockers | text[] | No | Active blockers |
| pending_decisions | text[] | No | Decisions awaiting input |
| owner_id | string | Yes | Primary human owner |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |

#### Phase (optional per project)

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | Yes | PK |
| project_id | uuid | Yes | FK |
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
|---|---|---|---|
| id | uuid | Yes | PK |
| project_id | uuid | Yes | FK (denormalized) |
| phase_id | uuid | No | FK. Null for flat projects. |
| source_id | string | No | Original ID from connected system (e.g., "1.1", "LIN-234") |
| title | string | Yes | Short, actionable |
| description | text | No | Extended detail |
| status | enum | Yes | `pending` / `in_progress` / `blocked` / `done` |
| priority | enum | No | `P1` / `P2` / `P3` |
| size | enum | No | `S` / `M` / `L` |
| owner_type | enum | No | `human` / `agent` |
| owner_id | string | No | References actor registry |
| deadline_at | timestamp | No | |
| blocked_reason | text | No | |
| depends_on | uuid[] | No | Linked task IDs |
| acceptance_criteria | text | No | |
| testing | text | No | Dev tasks primarily |
| notes | text | No | |
| data_origin | enum | Yes | `synced` / `native` |
| completed_at | timestamp | No | |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |

#### BacklogItem

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | Yes | PK |
| project_id | uuid | Yes | FK |
| source_id | string | No | Original ID from connected system |
| title | string | Yes | |
| description | text | No | |
| type | string | No | Bug, enhancement, idea, maintenance, etc. |
| component | string | No | What part of the project |
| priority | enum | No | `P1` / `P2` / `P3` |
| size | enum | No | `S` / `M` / `L` |
| status | enum | Yes | `pending` / `in_progress` / `blocked` |
| promoted_to_task_id | uuid | No | When graduated to active work |
| captured_via | string | No | Channel: `api`, `dashboard`, `connector` |
| notes | text | No | |
| data_origin | enum | Yes | `synced` / `native` |
| completed_at | timestamp | No | |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |

#### ActivityLog (append-only)

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | Yes | PK |
| entity_type | enum | Yes | `project` / `phase` / `task` / `backlog_item` |
| entity_id | uuid | Yes | FK |
| actor_type | enum | Yes | `human` / `agent` / `system` / `connector` |
| actor_id | string | Yes | |
| action | string | Yes | `created`, `status_changed`, `priority_changed`, `completed`, `promoted`, `synced`, etc. |
| detail | jsonb | No | Old/new values, context |
| timestamp | timestamp | Yes | |

#### ActorRegistry

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string | Yes | PK (e.g., "jess", "claude-code", "brennan") |
| name | string | Yes | Display name |
| type | enum | Yes | `human` / `agent` |
| active | boolean | Yes | |
| capabilities | text[] | No | What this actor can do |

#### Connector

| Field | Type | Required | Notes |
|---|---|---|---|
| id | uuid | Yes | PK |
| connector_type | string | Yes | `adf_markdown` / `linear` / `github` / etc. |
| project_id | uuid | Yes | FK — which Work OS project this feeds |
| config | jsonb | Yes | Connection details (repo path, API ref, project ID) |
| field_mapping | jsonb | No | How external fields map to Work OS entities |
| sync_frequency | enum | No | `on_demand` / `on_commit` / `hourly` / `daily` |
| last_sync_at | timestamp | No | |
| status | enum | Yes | `active` / `paused` / `error` |
| created_at | timestamp | Yes | |
| updated_at | timestamp | Yes | |

---

## 5) Status values and health model

### Task / Backlog status lifecycle

```
pending ──▶ in_progress ──▶ done
   │             │
   │             ▼
   └────▶   blocked ───▶ pending (unblocked)
```

### Project status

| Value | Meaning |
|---|---|
| `active` | Currently being worked |
| `paused` | Intentionally on hold |
| `completed` | All work finished |
| `archived` | Historical, no longer relevant |

### Project health (auto-computed with manual override)

| Health | Auto-computation logic |
|---|---|
| 🟢 Green | No blocked tasks. No overdue deadlines. Active progress in last 7 days. |
| 🟡 Yellow | Has blocked tasks OR deadlines within 48h OR no progress in 7+ days. |
| 🔴 Red | Has overdue deadlines OR >30% tasks blocked OR no progress in 14+ days. |

Manual override allowed with `health_reason` explanation.

---

## 6) API surface

### REST API endpoints

The REST API is the single source of business logic. All other interfaces (MCP, dashboard) consume it.

#### Projects
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List projects (filter by category, health, status, tags) |
| GET | `/api/projects/:id` | Get project detail with phases, task counts, blockers |
| POST | `/api/projects` | Create project |
| PATCH | `/api/projects/:id` | Update project fields |
| DELETE | `/api/projects/:id` | Archive project (soft delete) |

#### Phases
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects/:id/phases` | List phases for a project |
| POST | `/api/projects/:id/phases` | Create phase |
| PATCH | `/api/phases/:id` | Update phase |

#### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | List tasks (filter by project, phase, status, priority, owner, deadline range) |
| GET | `/api/tasks/:id` | Get task detail |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task fields |
| POST | `/api/tasks/:id/complete` | Mark task done |

#### Backlog
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects/:id/backlog` | List backlog items (filter by priority, status, type) |
| POST | `/api/projects/:id/backlog` | Create backlog item |
| PATCH | `/api/backlog/:id` | Update backlog item |
| POST | `/api/backlog/:id/promote` | Promote to task (requires target phase or flat project) |

#### Queries (read-only, cross-cutting)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/status` | Portfolio or scoped status summary |
| GET | `/api/whats-next` | Prioritized next actions (scope param) |
| GET | `/api/blockers` | All blocked items with context |
| GET | `/api/deadlines` | Deadline-relative queries (before, window) |
| GET | `/api/search` | Freeform search across entities |
| GET | `/api/digest/daily` | Generate daily digest data |
| GET | `/api/digest/weekly` | Generate weekly digest data |
| GET | `/api/activity` | Activity log (filter by entity, actor, date range) |

#### Connectors
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/connectors` | List configured connectors |
| POST | `/api/connectors` | Register connector |
| POST | `/api/connectors/:id/sync` | Trigger manual sync |

### MCP adapter

Thin layer translating MCP tool calls to REST API calls. Maps 1:1 with REST endpoints:

| MCP Tool | Maps to REST |
|---|---|
| `work_os_status` | GET `/api/status` |
| `work_os_whats_next` | GET `/api/whats-next` |
| `work_os_blockers` | GET `/api/blockers` |
| `work_os_deadlines` | GET `/api/deadlines` |
| `work_os_search` | GET `/api/search` |
| `work_os_digest` | GET `/api/digest/daily` or `/weekly` |
| `work_os_create` | POST to appropriate entity endpoint |
| `work_os_update` | PATCH to appropriate entity endpoint |
| `work_os_promote` | POST `/api/backlog/:id/promote` |
| `work_os_activity` | GET `/api/activity` |

The MCP server is provider-agnostic. Any LLM client that supports MCP (Claude Desktop, ChatGPT, Gemini, etc.) can connect.

---

## 7) Connector architecture

### Design principles

Connectors are pluggable, inbound-only integrations that feed external project/task data into Work OS.

- **One connector per project.** A project is either connected or native, not both.
- **Inbound only for MVP.** External system → Work OS. No write-back.
- **Standard contract.** Every connector produces data conforming to Work OS entity shapes.
- **Source of truth preserved.** Connected system owns its data. Work OS is a read-aggregator.
- **Work OS can annotate.** Cross-project metadata (health, portfolio priority, tags) can be added to connected projects without modifying source data.

### Connector contract

Any connector must map external data to:
- **Projects:** name, status, metadata
- **Phases (optional):** name, status, sequence
- **Tasks:** title, status, priority, owner, deadline
- **Backlog items:** title, priority, size, status
- **Activity events:** who, what, when

### MVP connector: ADF Markdown Sync

**Input:** Per-repo ADF artifacts (status.md, tasks.md, backlog.md)
**Mechanism:** Push-based script run at agent session end or on git commit hook
**Parsing:** Strict — ADF specs (ADF-STATUS-SPEC, ADF-TASKS-SPEC, ADF-BACKLOG-SPEC) are the contract

| ADF Artifact | Parses to |
|---|---|
| status.md | Project fields: current_stage, current_phase, focus, blockers, pending_decisions, next_steps |
| tasks.md active section | Task entities with status, acceptance criteria, dependencies |
| tasks.md handoff block | Phase transition state |
| tasks.md completed section | Completed tasks with dates |
| backlog.md queue | BacklogItem entities |
| backlog.md archive | Completed backlog items |

### Future connectors (backlogged)

| Connector | Source | Priority |
|---|---|---|
| Linear | Linear API | High — common dev tool |
| GitHub Issues/Projects | GitHub API | Medium |
| Notion databases | Notion API | Medium |
| Jira | Jira API | Low — enterprise, not current need |

### Data flow rules

| Source | Direction | Work OS role |
|---|---|---|
| Connected systems | Inbound only | Read-aggregator. External system is source of truth for its data. |
| Dashboard / API (native projects) | Direct write | Primary SoR. Work OS owns this data. |
| Dashboard / API (connected projects) | Read + annotate | Can add WOS metadata (health, portfolio priority, tags) but doesn't modify source-system data |

---

## 8) Digest engine

The digest engine lives in Work OS. It queries the SoR and produces structured data. **Delivery** (to Discord, Telegram, Slack, etc.) is Krypton's responsibility — Work OS just generates the content.

### A) Daily Digest

**Purpose:** Prepare tomorrow's focus

| Section | Data source | Logic |
|---|---|---|
| Tomorrow Focus (8–12 items) | Tasks: active, deadline-sorted, then priority-sorted | Cross-project. Deadline buckets first. |
| Deadline Risks (48h) | Tasks: deadline within 48h + blocked tasks | Include project context. |
| Blockers needing decision | Tasks: blocked + Project: pending_decisions | Items requiring human input. |
| Notable updates since last digest | ActivityLog: since last_digest_at | Completed tasks, phase transitions, status changes. |
| Backlog highlights | BacklogItems: P1, across portfolio | Optional. Items that may need promotion. |

### B) Weekly Digest

**Purpose:** Portfolio-level intelligence and decisions

| Section | Data source | Logic |
|---|---|---|
| Wins (last 7 days) | ActivityLog: completions, by category | Phases completed + notable tasks. |
| This week's priorities | Tasks: upcoming deadlines + active high-priority | Cross-project. |
| Decisions needed | Project: pending_decisions + Tasks: blocked | Aggregated with project context. |
| At-risk projects | Projects: health yellow/red | With health_reason. |
| Backlog review | BacklogItems: P1, created_at > 14 days ago | Stale high-priority items. |

### Output format
- Structured JSON (for programmatic consumers like Krypton)
- Pre-rendered Markdown (for direct paste/display)
- Scoped: full portfolio or filtered by project/category

### Digest metadata
| Field | Purpose |
|---|---|
| last_daily_digest_at | Timestamp of last daily generation — drives "since last digest" queries |
| last_weekly_digest_at | Timestamp of last weekly generation |

---

## 9) Dashboard UI/UX

### Design philosophy

- **Kanban-first.** Card-based views at every level.
- **Full work surface.** Read and write. CRUD + drag-and-drop for native projects.
- **Adaptive views.** View type matches project type and context. User can switch.
- **Clean and minimal.** Todoist-level simplicity. No feature bloat.
- **Desktop-primary.** Responsive/mobile is nice-to-have.
- **Connected project awareness.** Connected projects are read-only for source data, editable for Work OS annotations (health, tags, portfolio priority).

### View types (switchable per context)

| View | When used | Columns |
|---|---|---|
| **Stage Kanban** | Connected dev projects | Discover / Design / Develop / Deliver |
| **Status Kanban** | Default, simple projects | To Do / Doing / Done |
| **Phase Kanban** | Projects with phases | Pending / Active / Completed |
| **Priority Board** | Cross-project or within project | P1 / P2 / P3 |
| **Owner View** | Responsibility/delegation focus | Grouped by assignee |
| **Health Overview** | Portfolio level | Green / Yellow / Red |
| **Deadline View** | Time pressure focus | Overdue / Today / This Week / Next Week / Later |
| **Category View** | Portfolio filtered by domain | One section per category |

System auto-suggests default view based on project_type and has_phases. User can switch.

### Screens

#### A) Portfolio Dashboard
- Project cards in switchable Kanban layout
- Card: name, category tags, health, focus, task summary (X active / Y blocked / Z done), next deadline
- Filter bar: category, health, status, has-blockers
- Actions: drill into project, create new project

#### B) Project Detail
- Header: name, type (connected/native badge), categories, health, focus, blockers
- Adaptive main area:
  - Phase Kanban if has_phases = true
  - Task Kanban if flat
- Backlog section: priority-sorted list or mini-Kanban
- Connected project indicator: "Synced from ADF — last sync: [timestamp]"
- Actions: create phase/task, quick-add, edit project, promote backlog

#### C) Phase / Task Kanban
- Task cards by status (Pending / In Progress / Blocked / Done)
- Card: title, owner, priority, deadline, blocked flag, dependency indicator
- Drag-and-drop status changes (native projects only; connected projects read-only)
- Quick-add inline

#### D) Task Detail (slide-out panel)
- All fields: title, description, acceptance criteria, testing, owner, priority, deadline, dependencies, notes
- Activity log (recent entries from ledger)
- Status controls
- Inline editing (native projects); read-only display (connected projects, except WOS annotations)

#### E) Quick-Add
- Available everywhere (top of any list or column)
- Minimal: title + Enter
- Optional expansion: project, priority, deadline, owner, phase
- Keyboard shortcut triggered

#### F) Digest Preview
- Rendered daily/weekly digest with section navigation
- Copy Markdown / Copy Plain Text
- Scope filter: portfolio or single project/category
- Schedule indicator

#### G) Command Bar
- Keyboard-triggered (Cmd+K or /)
- Text input for queries and commands
- Routes to REST API (or through Krypton if connected)
- Example chips for common queries

### MVP UI scope

| In scope | Out of scope |
|---|---|
| Full CRUD: projects, phases, tasks, backlog (native) | User management / permissions |
| Read-only display for connected projects | Real-time collaboration / live cursors |
| Drag-and-drop status changes | Custom view builder |
| Multiple switchable views | Recurring task templates |
| Quick-add | Voice input |
| Command bar | Automated email delivery |
| Digest preview + copy | Advanced charts / reporting |
| Filter and search | Native mobile app |

---

## 10) Implementation sequencing

> Sequencing guidance, not an implementation plan.

### Phase 1: Data foundation
- Supabase schema (all entities from §4)
- Actor registry seed (Jess + known agents)
- Seed 5–8 real projects (mix of connected/native)
- Basic CRUD validation

### Phase 2: REST API
- Full CRUD endpoints (§6)
- Query endpoints (status, whats-next, blockers, deadlines, search)
- Activity log auto-population
- Health auto-computation

### Phase 3: MCP Adapter
- Thin MCP wrapper over REST API
- Wire to Claude Desktop for testing
- Validate read + write operations against real projects

### Phase 4: ADF Connector
- Markdown parser for status.md, tasks.md, backlog.md
- Push-based sync script
- Test against 3–5 dev project repos
- Validate: repo → Supabase → API → MCP queries

### Phase 5: Digest Engine
- Daily digest generator (SoR → structured JSON + Markdown)
- Weekly digest generator
- On-demand trigger via API
- Scheduled cron for automated generation

### Phase 6: Dashboard
- Portfolio view with project cards + filters
- Project detail (adaptive flat/phase)
- Task Kanban with drag-and-drop
- Quick-add, CRUD forms
- Command bar
- Digest preview
- Connected project read-only display

### Phase 7: Expand
- Additional Kanban views (priority, owner, deadline, category)
- Backlog promotion workflow UI
- Additional connectors (Linear, GitHub)
- Mobile responsiveness
- Multi-user access

---

## 11) Open decisions

| # | Decision | Context | Leaning |
|---|---|---|---|
| 1 | ADF sync trigger | Git hook vs. agent script vs. CI step | Agent script for MVP |
| 2 | Default digest schedule | Nightly time, weekly day/time | TBD |
| 3 | Bi-directional sync | Dashboard edits → connected system? | No. Likely never. |
| 4 | Plan entity | Explicit entity or implicit 1:1? | Implicit for MVP |
| 5 | Markdown parser tolerance | Strict ADF or fuzzy? | Strict — specs are the contract |
| 6 | Default view per project type | Auto-select or user chooses? | Auto-suggest, user switches |
| 7 | Governance: task closure | Who can close tasks? | Native: any authorized actor. Connected: respects source system rules. |
| 8 | Category taxonomy | Fixed or user-defined? | Fixed starter set + custom |
| 9 | Dashboard hosting | Vercel vs. self-hosted | TBD |
| 10 | Supabase project | New or reuse existing? | TBD |
| 11 | Inbox project | Dedicated project for unscoped captures? | Yes — "Inbox" as system project |
| 12 | Task ID display | UUID internal, human-readable display format? | UUID internal, display: PROJECT-NNN |
| 13 | Connector framework pattern | Custom per-connector or standard adapter? | Standard adapter pattern |
| 14 | REST API auth | Supabase auth, API keys, JWT? | TBD — single-user MVP may simplify |

---

## 12) What's NOT in this brief

- Krypton agent logic, autonomy model, channels (see Krypton Platform Brief)
- Implementation plans (separate per phase)
- API specifications / OpenAPI docs (build phase)
- Wireframes / mockups (design phase)
- Testing strategy (build phase)
- Deployment architecture (deliver phase)
- Cost analysis (post hosting decisions)

---
type: "design-supporting"
parent: "./design.md"
project: "Work Management"
version: "0.1"
created: "2026-02-10"
updated: "2026-02-10"
---

# Data Model: Work Management

## Overview

All entities from the Brief, refined with Supabase/Postgres-specific types, constraints, indexes, and computed fields. Schema is managed via Supabase CLI migrations.

## Enum Types

```sql
CREATE TYPE project_type AS ENUM ('connected', 'native');
CREATE TYPE project_status AS ENUM ('active', 'paused', 'completed', 'archived');
CREATE TYPE project_health AS ENUM ('green', 'yellow', 'red');
CREATE TYPE workflow_type AS ENUM ('flat', 'planned');
CREATE TYPE plan_status AS ENUM ('draft', 'approved', 'in_progress', 'completed');
CREATE TYPE phase_status AS ENUM ('pending', 'active', 'completed');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'blocked', 'done');
CREATE TYPE validation_status AS ENUM ('not_validated', 'passed', 'failed');
CREATE TYPE priority_level AS ENUM ('P1', 'P2', 'P3');
CREATE TYPE size_estimate AS ENUM ('S', 'M', 'L');
CREATE TYPE owner_type AS ENUM ('human', 'agent');
CREATE TYPE actor_type AS ENUM ('human', 'agent', 'system', 'connector');
CREATE TYPE data_origin AS ENUM ('synced', 'native');
CREATE TYPE backlog_status AS ENUM ('captured', 'triaged', 'prioritized', 'promoted', 'archived');
CREATE TYPE connector_status AS ENUM ('active', 'paused', 'error');
CREATE TYPE sync_frequency AS ENUM ('on_demand', 'on_commit', 'hourly', 'daily');
```

## Tables

### actor_registry

```sql
CREATE TABLE actor_registry (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  type        actor_type NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  capabilities text[],
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

### connector

```sql
CREATE TABLE connector (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_type  text NOT NULL,
  project_id      uuid NOT NULL REFERENCES project(id),
  config          jsonb NOT NULL DEFAULT '{}',
  field_mapping   jsonb,
  sync_frequency  sync_frequency DEFAULT 'on_demand',
  last_sync_at    timestamptz,
  status          connector_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

### project

```sql
CREATE TABLE project (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  description       text,
  project_type      project_type NOT NULL,
  categories        text[] NOT NULL CHECK (array_length(categories, 1) >= 1),
  tags              text[],
  health_override   project_health,
  health_reason     text,
  status            project_status NOT NULL DEFAULT 'active',
  focus             text,
  workflow_type     workflow_type NOT NULL,
  current_stage     text,
  current_phase_id  uuid REFERENCES phase(id),
  blockers          text[],
  pending_decisions text[],
  owner_id          text NOT NULL REFERENCES actor_registry(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
```

**Note:** `health_override` replaces the Brief's `health` field. Computed health is query-time (see Health Computation below). The override lets the user force a health status. If null, computed health is used.

**Note:** `connector_id` from the Brief's entity model is not on this table. The relationship is modeled via `connector.project_id` (1:1). To find a project's connector: `SELECT * FROM connector WHERE project_id = ?`. This avoids a circular FK dependency between project and connector tables.

### plan

```sql
CREATE TABLE plan (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES project(id),
  name        text NOT NULL,
  description text,
  status      plan_status NOT NULL DEFAULT 'draft',
  approved_at timestamptz,
  approved_by text REFERENCES actor_registry(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

### phase

```sql
CREATE TABLE phase (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         uuid NOT NULL REFERENCES plan(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES project(id),
  name            text NOT NULL,
  description     text,
  sort_order      int NOT NULL,
  status          phase_status NOT NULL DEFAULT 'pending',
  handoff_notes   text,
  deadline_at     timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
```

### task

```sql
CREATE TABLE task (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES project(id),
  plan_id             uuid REFERENCES plan(id),
  phase_id            uuid REFERENCES phase(id),
  display_id          int NOT NULL,
  source_id           text,
  title               text NOT NULL,
  description         text,
  status              task_status NOT NULL DEFAULT 'pending',
  validation_status   validation_status DEFAULT 'not_validated',
  validated_by        text REFERENCES actor_registry(id),
  validated_at        timestamptz,
  priority            priority_level,
  size                size_estimate,
  owner_type          owner_type,
  owner_id            text REFERENCES actor_registry(id),
  deadline_at         timestamptz,
  blocked_reason      text,
  depends_on          uuid[],
  acceptance_criteria text,
  outcome             text,
  sort_order          int,
  notes               text,
  data_origin         data_origin NOT NULL DEFAULT 'native',
  completed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (project_id, display_id),
  UNIQUE (project_id, source_id)
);
```

### backlog_item

```sql
CREATE TABLE backlog_item (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES project(id),
  source_id           text,
  title               text NOT NULL,
  description         text,
  type                text,
  component           text,
  priority            priority_level,
  size                size_estimate,
  status              backlog_status NOT NULL DEFAULT 'captured',
  promoted_to_task_id uuid REFERENCES task(id),
  captured_via        text,
  notes               text,
  data_origin         data_origin NOT NULL DEFAULT 'native',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (project_id, source_id)
);
```

### activity_log

```sql
CREATE TABLE activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id   uuid NOT NULL,
  actor_type  actor_type NOT NULL,
  actor_id    text NOT NULL REFERENCES actor_registry(id),
  action      text NOT NULL,
  detail      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

**Note:** No `updated_at` — activity log is append-only. Column renamed from `timestamp` to `created_at` to avoid reserved word conflicts.

## Display ID Generation

Auto-incrementing display ID per project, assigned via database function + trigger:

```sql
CREATE TABLE project_display_id_seq (
  project_id uuid PRIMARY KEY REFERENCES project(id),
  next_val   int NOT NULL DEFAULT 1
);

CREATE OR REPLACE FUNCTION assign_task_display_id()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_display_id_seq (project_id, next_val)
  VALUES (NEW.project_id, 2)
  ON CONFLICT (project_id) DO UPDATE
  SET next_val = project_display_id_seq.next_val + 1
  RETURNING next_val - 1 INTO NEW.display_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_display_id_trigger
  BEFORE INSERT ON task
  FOR EACH ROW
  EXECUTE FUNCTION assign_task_display_id();
```

This gives each project its own sequence: first task = #1, second = #2, etc.

## Indexes

```sql
-- Project lookups
CREATE INDEX idx_project_status ON project(status);
CREATE INDEX idx_project_categories ON project USING GIN(categories);
CREATE INDEX idx_project_tags ON project USING GIN(tags);

-- Plan lookups
CREATE INDEX idx_plan_project ON plan(project_id);
CREATE INDEX idx_plan_status ON plan(project_id, status);

-- Phase lookups
CREATE INDEX idx_phase_plan ON phase(plan_id);
CREATE INDEX idx_phase_project ON phase(project_id);
CREATE INDEX idx_phase_sort ON phase(plan_id, sort_order);

-- Task lookups (most queried table)
CREATE INDEX idx_task_project ON task(project_id);
CREATE INDEX idx_task_phase ON task(phase_id);
CREATE INDEX idx_task_status ON task(project_id, status);
CREATE INDEX idx_task_priority ON task(priority);
CREATE INDEX idx_task_deadline ON task(deadline_at) WHERE deadline_at IS NOT NULL;
CREATE INDEX idx_task_source ON task(project_id, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_task_owner ON task(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_task_display ON task(project_id, display_id);

-- Backlog lookups
CREATE INDEX idx_backlog_project ON backlog_item(project_id);
CREATE INDEX idx_backlog_status ON backlog_item(project_id, status);
CREATE INDEX idx_backlog_source ON backlog_item(project_id, source_id)
  WHERE source_id IS NOT NULL;

-- Activity log lookups
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_actor ON activity_log(actor_id);
CREATE INDEX idx_activity_time ON activity_log(created_at DESC);
CREATE INDEX idx_activity_project_time ON activity_log(entity_type, entity_id, created_at DESC);
```

## Full-Text Search

The `/api/search` endpoint uses Postgres full-text search. Generated `tsvector` columns with GIN indexes on task and backlog_item for fast keyword search across title and description.

```sql
-- Add generated tsvector column to task
ALTER TABLE task ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX idx_task_search ON task USING GIN(search_vector);

-- Add generated tsvector column to backlog_item
ALTER TABLE backlog_item ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX idx_backlog_search ON backlog_item USING GIN(search_vector);
```

**Query pattern:** `SELECT * FROM task WHERE search_vector @@ plainto_tsquery('english', $1)` with `ts_rank` for relevance ordering. Results from task and backlog_item are combined via UNION ALL with entity type tag.

## Row Level Security (RLS)

Single-user MVP: all authenticated users have full access. RLS exists as a security baseline — tightened when multi-user is added.

```sql
-- Enable RLS on all tables
ALTER TABLE project ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase ENABLE ROW LEVEL SECURITY;
ALTER TABLE task ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlog_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE actor_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector ENABLE ROW LEVEL SECURITY;

-- Authenticated users can do everything (single-user MVP)
-- One policy per table, example:
CREATE POLICY "authenticated_full_access" ON project
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Repeat for all tables
-- Service role bypasses RLS automatically (used by MCP server)
```

## Health Computation

Computed at query time in the API layer. Not stored on the project row.

```typescript
type HealthSignal = { health: 'green' | 'yellow' | 'red'; reason: string };

function computeProjectHealth(project: Project, tasks: Task[], lastActivity: Date | null): HealthSignal {
  const activeTasks = tasks.filter(t => t.status !== 'done');
  const blockedTasks = activeTasks.filter(t => t.status === 'blocked');
  const now = new Date();

  // Red signals (worst first)
  const overdue = tasks.filter(t =>
    t.deadline_at && t.deadline_at < now && t.status !== 'done'
  );
  if (overdue.length > 0)
    return { health: 'red', reason: `${overdue.length} overdue task(s)` };

  if (activeTasks.length > 0 && blockedTasks.length / activeTasks.length > 0.3)
    return { health: 'red', reason: `${blockedTasks.length}/${activeTasks.length} tasks blocked (>30%)` };

  const daysSinceActivity = lastActivity
    ? (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;
  if (daysSinceActivity > 14)
    return { health: 'red', reason: `No activity in ${Math.floor(daysSinceActivity)} days` };

  // Yellow signals
  const soonDeadlines = tasks.filter(t =>
    t.deadline_at && t.deadline_at > now &&
    t.deadline_at < new Date(now.getTime() + 48 * 60 * 60 * 1000) &&
    t.status !== 'done'
  );
  if (soonDeadlines.length > 0)
    return { health: 'yellow', reason: `${soonDeadlines.length} deadline(s) within 48h` };

  if (blockedTasks.length > 0)
    return { health: 'yellow', reason: `${blockedTasks.length} blocked task(s)` };

  if (daysSinceActivity > 7)
    return { health: 'yellow', reason: `No activity in ${Math.floor(daysSinceActivity)} days` };

  // Green
  return { health: 'green', reason: 'On track' };
}
```

If `health_override` is set on the project, it takes precedence over computed health.

## Activity Logging

API-level middleware pattern. Every mutation handler calls `logActivity()` after successful database write.

```typescript
async function logActivity(params: {
  entityType: string;
  entityId: string;
  actorType: 'human' | 'agent' | 'system' | 'connector';
  actorId: string;
  action: string;
  detail?: Record<string, unknown>;
}) {
  await supabase.from('activity_log').insert({
    entity_type: params.entityType,
    entity_id: params.entityId,
    actor_type: params.actorType,
    actor_id: params.actorId,
    action: params.action,
    detail: params.detail ?? null,
  });
}
```

**Actor identification:** Extracted from JWT claims (user ID) or API key context (MCP server identifies as its configured actor). Connector requests use `actor_type = 'connector'`.

**Standard actions:**

| Action | Trigger |
|--------|---------|
| `created` | Entity inserted |
| `updated` | Entity modified (detail includes changed fields) |
| `status_changed` | Status field changed (detail includes old/new) |
| `promoted` | Backlog item promoted to task |
| `validated` | Task validation_status changed |
| `synced` | Entity created/updated via connector |
| `archived` | Entity archived (soft delete) |

## Seed Data

Initial seed with 5-8 real projects representing actual work:

```sql
-- Actors
INSERT INTO actor_registry (id, name, type, active) VALUES
  ('jess', 'Jess', 'human', true),
  ('claude-code', 'Claude Code', 'agent', true),
  ('adf-connector', 'ADF Connector', 'agent', true);

-- Mix of connected (ADF) and native projects
-- Connected: work-management, adf, capabilities-registry, etc.
-- Native: personal tasks, business consulting, board work
-- Specific projects determined during Develop based on current repos
```

## Supabase Free Tier Validation

| Resource | Limit | MVP Usage | Headroom |
|----------|-------|-----------|----------|
| Database size | 500 MB | <10 MB (entities + activity) | ~50x |
| API requests | Unlimited | Low (single user) | N/A |
| Auth users | 50,000 MAU | 1 | Unlimited |
| Edge functions | 500K invocations | Not used | N/A |
| Storage | 1 GB | Not used | N/A |

At 100 activity events/day (~500 bytes each), annual growth is ~18 MB. Not a concern for years.

## Migration Strategy

Supabase CLI manages migrations:

```bash
# Create migration
supabase migration new <name>

# Apply locally
supabase db reset

# Apply to production
supabase db push
```

**Migration ordering:**
1. Enum types
2. actor_registry (no FKs)
3. project (references actor_registry — current_phase_id FK deferred)
4. plan (references project)
5. phase (references plan, project)
6. ALTER project ADD CONSTRAINT fk_current_phase REFERENCES phase(id) (deferred FK)
7. connector (references project)
8. task (references project, plan, phase, actor_registry)
9. backlog_item (references project, task)
10. activity_log (references actor_registry)
11. project_display_id_seq + trigger
12. Full-text search columns + GIN indexes
13. Indexes
14. RLS policies
15. Seed data

-- Project lookups
CREATE INDEX idx_project_status ON project(status);
CREATE INDEX idx_project_categories ON project USING GIN(categories);
CREATE INDEX idx_project_tags ON project USING GIN(tags);

-- Plan lookups
CREATE INDEX idx_plan_project ON plan(project_id);
CREATE INDEX idx_plan_status ON plan(project_id, status);

-- One-active-plan constraint (DB-level enforcement alongside API validation)
CREATE UNIQUE INDEX idx_plan_one_active ON plan(project_id)
  WHERE status NOT IN ('completed');

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

-- Full-Text Search
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

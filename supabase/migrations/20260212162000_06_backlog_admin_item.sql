-- Backlog admin items: project-scoped backlog contract for work-management governance.
CREATE TABLE backlog_admin_item (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  backlog_key      text NOT NULL,
  title            text NOT NULL,
  item_type        text,
  component        text,
  priority         priority_level,
  size             size_estimate,
  status           text NOT NULL DEFAULT 'Pending',
  notes            text,
  source_of_truth  text NOT NULL DEFAULT 'db',
  sync_state       text NOT NULL DEFAULT 'in_sync',
  last_synced_at   timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT backlog_admin_item_status_check CHECK (
    status IN ('Pending', 'In Progress', 'Partial', 'Done', 'Deferred', 'Archived')
  ),
  CONSTRAINT backlog_admin_item_source_check CHECK (
    source_of_truth IN ('db', 'markdown', 'adf')
  ),
  CONSTRAINT backlog_admin_item_sync_state_check CHECK (
    sync_state IN ('in_sync', 'needs_export', 'needs_import', 'conflict')
  ),
  CONSTRAINT backlog_admin_item_key_format CHECK (backlog_key ~ '^B[0-9]+$'),
  UNIQUE (project_id, backlog_key)
);

CREATE INDEX idx_backlog_admin_item_project ON backlog_admin_item(project_id);
CREATE INDEX idx_backlog_admin_item_status ON backlog_admin_item(project_id, status);
CREATE INDEX idx_backlog_admin_item_priority ON backlog_admin_item(project_id, priority);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON backlog_admin_item
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

ALTER TABLE backlog_admin_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON backlog_admin_item
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

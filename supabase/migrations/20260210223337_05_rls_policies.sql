-- Enable RLS on all tables
ALTER TABLE project ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase ENABLE ROW LEVEL SECURITY;
ALTER TABLE task ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlog_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE actor_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_display_id_seq ENABLE ROW LEVEL SECURITY;

-- Authenticated users can do everything (single-user MVP)
-- Project
CREATE POLICY "authenticated_full_access" ON project
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Plan
CREATE POLICY "authenticated_full_access" ON plan
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Phase
CREATE POLICY "authenticated_full_access" ON phase
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Task
CREATE POLICY "authenticated_full_access" ON task
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Backlog Item
CREATE POLICY "authenticated_full_access" ON backlog_item
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Activity Log
CREATE POLICY "authenticated_full_access" ON activity_log
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Actor Registry
CREATE POLICY "authenticated_full_access" ON actor_registry
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Connector
CREATE POLICY "authenticated_full_access" ON connector
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Project Display ID Sequence
CREATE POLICY "authenticated_full_access" ON project_display_id_seq
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

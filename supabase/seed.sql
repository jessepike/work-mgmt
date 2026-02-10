-- Actors
INSERT INTO actor_registry (id, name, type, active) VALUES
  ('jess', 'Jess', 'human', true),
  ('claude-code', 'Claude Code', 'agent', true),
  ('adf-connector', 'ADF Connector', 'agent', true)
ON CONFLICT (id) DO UPDATE SET active = excluded.active;

-- Initial Projects
INSERT INTO project (id, name, project_type, categories, workflow_type, owner_id, status, description) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Work Management', 'connected', ARRAY['dev', 'meta'], 'planned', 'jess', 'active', 'Central work tracking system'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'ADF', 'connected', ARRAY['dev', 'core'], 'planned', 'jess', 'active', 'Agentic Development Framework'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Personal', 'native', ARRAY['personal'], 'flat', 'jess', 'active', 'Personal tasks and errands')
ON CONFLICT (id) DO UPDATE SET 
  name = excluded.name,
  description = excluded.description,
  project_type = excluded.project_type;

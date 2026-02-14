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
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Personal', 'native', ARRAY['personal'], 'flat', 'jess', 'active', 'Personal tasks and errands'),
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Krypton', 'connected', ARRAY['ops', 'agent'], 'planned', 'jess', 'active', 'Chief of staff agent orchestration'),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Knowledge Base', 'connected', ARRAY['knowledge', 'infra'], 'planned', 'jess', 'active', 'Knowledge retrieval and indexing'),
  ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Capabilities Registry', 'connected', ARRAY['platform', 'infra'], 'planned', 'jess', 'active', 'Agent capability catalog and metadata'),
  ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'Business Ops', 'native', ARRAY['business'], 'flat', 'jess', 'active', 'Business operations and planning'),
  ('ce973e7b-f899-46ec-9ac9-cffa31b56d1a', 'Inbox', 'native', ARRAY['meta'], 'flat', 'jess', 'active', 'Catch-all project for untriaged items, ideas, and low-confidence ingest results')
ON CONFLICT (id) DO UPDATE SET 
  name = excluded.name,
  description = excluded.description,
  project_type = excluded.project_type;

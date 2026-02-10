-- Display ID Generation
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

-- Automated updated_at maintenance (moddatetime)
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON actor_registry
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON project
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON plan
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON phase
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON connector
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON task
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON backlog_item
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

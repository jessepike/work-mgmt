-- Add display_id to backlog_item (mirrors task display_id pattern)

-- 1. Add nullable column
ALTER TABLE backlog_item ADD COLUMN display_id int;

-- 2. Separate sequence table for backlog (avoids collision with task display_ids)
CREATE TABLE backlog_display_id_seq (
  project_id uuid PRIMARY KEY REFERENCES project(id),
  next_val   int NOT NULL DEFAULT 1
);

ALTER TABLE backlog_display_id_seq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_full_access" ON backlog_display_id_seq
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 3. Trigger function
CREATE OR REPLACE FUNCTION assign_backlog_display_id()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO backlog_display_id_seq (project_id, next_val)
  VALUES (NEW.project_id, 2)
  ON CONFLICT (project_id) DO UPDATE
  SET next_val = backlog_display_id_seq.next_val + 1
  RETURNING next_val - 1 INTO NEW.display_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Backfill existing rows (sequential per project, ordered by created_at)
DO $$
DECLARE
  r RECORD;
  seq int;
  last_project uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  FOR r IN
    SELECT id, project_id
    FROM backlog_item
    WHERE display_id IS NULL
    ORDER BY project_id, created_at
  LOOP
    IF r.project_id <> last_project THEN
      seq := 1;
      last_project := r.project_id;
    END IF;

    UPDATE backlog_item SET display_id = seq WHERE id = r.id;
    seq := seq + 1;
  END LOOP;

  -- Seed sequence table from backfilled max
  INSERT INTO backlog_display_id_seq (project_id, next_val)
  SELECT project_id, COALESCE(MAX(display_id), 0) + 1
  FROM backlog_item
  WHERE display_id IS NOT NULL
  GROUP BY project_id
  ON CONFLICT (project_id) DO UPDATE
  SET next_val = EXCLUDED.next_val;
END;
$$;

-- 5. Make NOT NULL after backfill, add unique index
ALTER TABLE backlog_item ALTER COLUMN display_id SET NOT NULL;
ALTER TABLE backlog_item ALTER COLUMN display_id SET DEFAULT 0;

CREATE UNIQUE INDEX idx_backlog_display ON backlog_item(project_id, display_id);

-- 6. Attach trigger (after backfill so trigger assigns for new rows)
CREATE TRIGGER backlog_display_id_trigger
  BEFORE INSERT ON backlog_item
  FOR EACH ROW
  EXECUTE FUNCTION assign_backlog_display_id();

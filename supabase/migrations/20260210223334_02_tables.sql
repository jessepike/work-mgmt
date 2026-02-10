-- actor_registry
CREATE TABLE actor_registry (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  type        actor_type NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  capabilities text[],
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- project
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
  current_phase_id  uuid, -- FK added later
  blockers          text[],
  pending_decisions text[],
  owner_id          text NOT NULL REFERENCES actor_registry(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- plan
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

-- phase
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

-- Add deferred FK to project
ALTER TABLE project
  ADD CONSTRAINT fk_project_current_phase
  FOREIGN KEY (current_phase_id)
  REFERENCES phase(id);

-- connector
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

-- task
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

-- backlog_item
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

-- activity_log (no Foreign Key to entities as it is polymorphic)
-- But it has FK to actor
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

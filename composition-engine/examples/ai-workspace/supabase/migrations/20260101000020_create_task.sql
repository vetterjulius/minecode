-- Entity: Task (feature: tasks)
-- App task
CREATE TABLE IF NOT EXISTS "task" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(255) NOT NULL,
  "priority" VARCHAR(255) NOT NULL,
  "project_id" UUID NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "assignee_id" UUID REFERENCES "profile"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_task_assignee_id" ON "task" ("assignee_id");
CREATE INDEX IF NOT EXISTS "idx_task_project_id" ON "task" ("project_id");

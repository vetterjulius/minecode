-- Entity: Project (feature: projects)
-- App project
CREATE TABLE IF NOT EXISTS "project" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(255) NOT NULL,
  "organization_id" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "workspace_id" UUID NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_project_organization_id" ON "project" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_project_workspace_id" ON "project" ("workspace_id");

-- Entity: Workspace (feature: workspaces)
-- App workspace
CREATE TABLE IF NOT EXISTS "workspace" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "organization_id" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_workspace_organization_id" ON "workspace" ("organization_id");

-- SQL DDL for entity: Workspace
-- Description: App workspace
CREATE TABLE IF NOT EXISTS "workspace" (
  "id" UUID PRIMARY KEY NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "organizationId" UUID NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

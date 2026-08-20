-- SQL Migration: 0015_workspaces_schema.sql
-- Description: Create workspaces table

CREATE TABLE IF NOT EXISTS "workspace" (
  "id" UUID PRIMARY KEY NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "organizationId" UUID NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- SQL Migration: 0016_projects_schema.sql
-- Description: Create projects table

CREATE TABLE IF NOT EXISTS "project" (
  "id" UUID PRIMARY KEY NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(255) NOT NULL,
  "organizationid" UUID NOT NULL,
  "workspaceid" UUID NOT NULL,
  "createdat" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

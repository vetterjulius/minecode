-- SQL Migration: 0017_tasks_schema.sql
-- Description: Create tasks table

CREATE TABLE IF NOT EXISTS "task" (
  "id" UUID PRIMARY KEY NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(255) NOT NULL,
  "priority" VARCHAR(255) NOT NULL,
  "projectid" UUID NOT NULL,
  "assigneeid" UUID,
  "createdat" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

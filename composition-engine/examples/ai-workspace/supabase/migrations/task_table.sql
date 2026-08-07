-- SQL DDL for entity: Task
-- Description: App task
CREATE TABLE IF NOT EXISTS "task" (
  "id" UUID PRIMARY KEY NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(255) NOT NULL,
  "priority" VARCHAR(255) NOT NULL,
  "projectid" UUID NOT NULL,
  "assigneeid" UUID,
  "createdat" TIMESTAMP WITH TIME ZONE NOT NULL
);

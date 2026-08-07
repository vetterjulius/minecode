-- SQL DDL for entity: Document
-- Description: App document
CREATE TABLE IF NOT EXISTS "document" (
  "id" UUID PRIMARY KEY NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "content" TEXT,
  "projectid" UUID NOT NULL,
  "createdat" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- SQL DDL for entity: File
-- Description: Uploaded file metadata tracking
CREATE TABLE IF NOT EXISTS "file" (
  "id" UUID PRIMARY KEY NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "path" VARCHAR(255) NOT NULL,
  "size" INTEGER NOT NULL,
  "mimeType" VARCHAR(255) NOT NULL,
  "organizationId" UUID,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- SQL Migration: 0018_documents_schema.sql
-- Description: Create documents table

CREATE TABLE IF NOT EXISTS "document" (
  "id" UUID PRIMARY KEY NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "content" TEXT,
  "projectId" UUID NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

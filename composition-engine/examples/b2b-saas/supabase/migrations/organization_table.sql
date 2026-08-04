-- SQL DDL for entity: Organization
-- Description: App organization (tenant)
CREATE TABLE IF NOT EXISTS "organization" (
  "id" UUID PRIMARY KEY NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

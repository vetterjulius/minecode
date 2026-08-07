-- SQL DDL for entity: Metric
-- Description: System metrics and resource usages
CREATE TABLE IF NOT EXISTS "metric" (
  "id" UUID PRIMARY KEY NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "value" TEXT NOT NULL,
  "organizationId" UUID NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

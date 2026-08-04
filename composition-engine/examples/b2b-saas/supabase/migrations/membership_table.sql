-- SQL DDL for entity: Membership
-- Description: User membership inside an organization
CREATE TABLE IF NOT EXISTS "membership" (
  "id" UUID PRIMARY KEY NOT NULL,
  "organizationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

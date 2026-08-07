-- SQL DDL for entity: Invitation
-- Description: Organization join invitation
CREATE TABLE IF NOT EXISTS "invitation" (
  "id" UUID PRIMARY KEY NOT NULL,
  "organizationId" UUID NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "role" VARCHAR(255) NOT NULL,
  "token" VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- SQL DDL for entity: Subscription
-- Description: Organization subscription details
CREATE TABLE IF NOT EXISTS "subscription" (
  "id" UUID PRIMARY KEY NOT NULL,
  "organizationId" UUID NOT NULL,
  "status" VARCHAR(255) NOT NULL,
  "priceId" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

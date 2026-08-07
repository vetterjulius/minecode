-- SQL DDL for entity: Ticket
-- Description: Customer support ticket tracking
CREATE TABLE IF NOT EXISTS "ticket" (
  "id" UUID PRIMARY KEY NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "status" VARCHAR(255) NOT NULL,
  "priority" VARCHAR(255) NOT NULL,
  "assigneeId" UUID,
  "organizationId" UUID NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

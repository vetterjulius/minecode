-- SQL DDL for entity: Feedback
-- Description: Customer satisfaction rating and text feedback
CREATE TABLE IF NOT EXISTS "feedback" (
  "id" UUID PRIMARY KEY NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" VARCHAR(255),
  "userId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

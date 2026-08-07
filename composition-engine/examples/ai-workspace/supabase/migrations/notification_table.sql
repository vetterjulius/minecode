-- SQL DDL for entity: Notification
-- Description: Notification tracking and status
CREATE TABLE IF NOT EXISTS "notification" (
  "id" UUID PRIMARY KEY NOT NULL,
  "userId" UUID NOT NULL,
  "channel" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "content" VARCHAR(255) NOT NULL,
  "status" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

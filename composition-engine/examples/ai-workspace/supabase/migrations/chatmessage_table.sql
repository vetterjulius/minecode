-- SQL DDL for entity: ChatMessage
-- Description: Chat message log
CREATE TABLE IF NOT EXISTS "chatmessage" (
  "id" UUID PRIMARY KEY NOT NULL,
  "sessionId" UUID NOT NULL,
  "role" VARCHAR(255) NOT NULL,
  "content" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

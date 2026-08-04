-- SQL DDL for entity: Session
-- Description: Active session token
CREATE TABLE IF NOT EXISTS "session" (
  "id" UUID PRIMARY KEY NOT NULL,
  "userId" UUID NOT NULL,
  "token" VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

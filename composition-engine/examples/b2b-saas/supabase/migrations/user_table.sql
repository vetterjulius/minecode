-- SQL DDL for entity: User
-- Description: App user account
CREATE TABLE IF NOT EXISTS "user" (
  "id" UUID PRIMARY KEY NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

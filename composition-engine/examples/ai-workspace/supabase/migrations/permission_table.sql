-- SQL DDL for entity: Permission
-- Description: Specific action permission key
CREATE TABLE IF NOT EXISTS "permission" (
  "id" UUID PRIMARY KEY NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" VARCHAR(255)
);

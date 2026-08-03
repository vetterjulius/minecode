-- SQL DDL for entity: Role
-- Description: User security group role
CREATE TABLE IF NOT EXISTS "role" (
  "id" UUID PRIMARY KEY NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" VARCHAR(255)
);

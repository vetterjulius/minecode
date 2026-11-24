-- Entity: Role (feature: rbac)
-- User security group role
CREATE TABLE IF NOT EXISTS "role" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "description" VARCHAR(255)
);

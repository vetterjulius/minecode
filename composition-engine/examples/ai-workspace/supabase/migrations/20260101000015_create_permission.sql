-- Entity: Permission (feature: rbac)
-- Specific action permission key
CREATE TABLE IF NOT EXISTS "permission" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "description" VARCHAR(255)
);

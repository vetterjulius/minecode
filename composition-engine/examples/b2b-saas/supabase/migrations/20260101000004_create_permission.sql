-- Entity: Permission (feature: rbac)
-- Specific action permission key
CREATE TABLE IF NOT EXISTS "permission" (
  "name" VARCHAR(255) PRIMARY KEY NOT NULL,
  "description" VARCHAR(255)
);

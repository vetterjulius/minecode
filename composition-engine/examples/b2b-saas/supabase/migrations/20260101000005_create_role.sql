-- Entity: Role (feature: rbac)
-- Named bundle of permissions assigned to organization members
CREATE TABLE IF NOT EXISTS "role" (
  "name" VARCHAR(255) PRIMARY KEY NOT NULL,
  "description" VARCHAR(255)
);

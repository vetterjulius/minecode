-- RBAC Role and Permission schema migrations
CREATE TABLE IF NOT EXISTS "role" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "description" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "permission" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "description" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "role_permission" (
  "roleid" UUID REFERENCES "role"("id") ON DELETE CASCADE,
  "permissionid" UUID REFERENCES "permission"("id") ON DELETE CASCADE,
  PRIMARY KEY ("roleid", "permissionid")
);

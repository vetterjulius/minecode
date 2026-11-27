-- Entity: RolePermission (feature: rbac)
-- Grants a permission to a role
CREATE TABLE IF NOT EXISTS "role_permission" (
  "role" VARCHAR(255) NOT NULL REFERENCES "role"("name") ON DELETE CASCADE,
  "permission" VARCHAR(255) NOT NULL REFERENCES "permission"("name") ON DELETE CASCADE,
  PRIMARY KEY ("role", "permission")
);

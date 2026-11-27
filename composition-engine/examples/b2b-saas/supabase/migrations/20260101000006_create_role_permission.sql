-- Entity: RolePermission (feature: rbac)
-- Grants a permission to a role
CREATE TABLE IF NOT EXISTS "role_permission" (
  "role_id" UUID NOT NULL REFERENCES "role"("id") ON DELETE CASCADE,
  "permission_id" UUID NOT NULL REFERENCES "permission"("id") ON DELETE CASCADE,
  PRIMARY KEY ("role_id", "permission_id")
);

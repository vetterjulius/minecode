-- Roles and permissions of this application (additive, safe to re-run).
INSERT INTO "permission" ("name", "description") VALUES
  ('auth.read', 'Read auth details'),
  ('auth.write', 'Modify auth details'),
  ('billing.read', 'Read billing details and subscriptions'),
  ('billing.write', 'Modify subscriptions or create checkouts'),
  ('org.invite', 'Invite members to organization'),
  ('org.read', 'Read organization details'),
  ('org.write', 'Modify organization details'),
  ('rbac.read', 'Read RBAC configurations'),
  ('rbac.write', 'Modify RBAC roles and permissions')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role" ("name") VALUES
  ('admin'),
  ('member'),
  ('billing_admin')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "role_permission" ("role", "permission") VALUES
  ('admin', 'auth.read'),
  ('admin', 'auth.write'),
  ('admin', 'billing.read'),
  ('admin', 'org.invite'),
  ('admin', 'org.read'),
  ('admin', 'org.write'),
  ('admin', 'rbac.read'),
  ('member', 'auth.read'),
  ('member', 'auth.write'),
  ('member', 'org.read'),
  ('billing_admin', 'auth.read'),
  ('billing_admin', 'billing.read'),
  ('billing_admin', 'org.read'),
  ('billing_admin', 'rbac.read')
ON CONFLICT DO NOTHING;

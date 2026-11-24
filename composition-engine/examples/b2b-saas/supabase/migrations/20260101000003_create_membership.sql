-- Entity: Membership (feature: organizations)
-- User membership inside an organization
CREATE TABLE IF NOT EXISTS "membership" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "profile"("id") ON DELETE CASCADE,
  "role" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_membership_organization_id" ON "membership" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_membership_user_id" ON "membership" ("user_id");

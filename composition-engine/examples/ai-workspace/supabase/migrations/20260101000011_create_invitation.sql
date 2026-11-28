-- Entity: Invitation (feature: organizations)
-- Organization join invitation
CREATE TABLE IF NOT EXISTS "invitation" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "email" VARCHAR(255) NOT NULL,
  "role" VARCHAR(255) NOT NULL,
  "token" VARCHAR(255) NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "accepted_at" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "idx_invitation_organization_id" ON "invitation" ("organization_id");

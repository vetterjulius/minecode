-- Entity: Organization (feature: organizations)
-- App organization (tenant)
CREATE TABLE IF NOT EXISTS "organization" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

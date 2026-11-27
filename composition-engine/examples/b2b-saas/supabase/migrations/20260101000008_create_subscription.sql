-- Entity: Subscription (feature: billing)
-- Organization subscription details
CREATE TABLE IF NOT EXISTS "subscription" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "status" VARCHAR(255) NOT NULL,
  "price_id" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_subscription_organization_id" ON "subscription" ("organization_id");

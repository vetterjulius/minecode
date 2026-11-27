-- Entity: StripeCustomer (feature: billing)
-- Mapping of organization to Stripe customer
CREATE TABLE IF NOT EXISTS "stripe_customer" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "stripe_customer_id" VARCHAR(255) NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS "idx_stripe_customer_organization_id" ON "stripe_customer" ("organization_id");

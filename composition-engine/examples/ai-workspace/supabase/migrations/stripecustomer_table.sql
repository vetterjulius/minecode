-- SQL DDL for entity: StripeCustomer
-- Description: Mapping of organization to Stripe customer
CREATE TABLE IF NOT EXISTS "stripecustomer" (
  "id" UUID PRIMARY KEY NOT NULL,
  "organizationId" UUID NOT NULL,
  "stripeCustomerId" VARCHAR(255) NOT NULL
);

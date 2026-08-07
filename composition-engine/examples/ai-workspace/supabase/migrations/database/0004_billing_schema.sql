-- Stripe Customer and Subscription schema migrations
CREATE TABLE IF NOT EXISTS "stripe_customer" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationid" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "stripecustomerid" VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "subscription" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationid" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "status" VARCHAR(255) NOT NULL,
  "priceid" VARCHAR(255) NOT NULL,
  "createdat" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

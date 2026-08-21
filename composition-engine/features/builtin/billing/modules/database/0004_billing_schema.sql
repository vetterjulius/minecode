-- Stripe Customer and Subscription schema migrations
CREATE TABLE IF NOT EXISTS "stripe_customer" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "stripeCustomerId" VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "subscription" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "status" VARCHAR(255) NOT NULL,
  "priceId" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

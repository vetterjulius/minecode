-- Organization, Membership and Invitation schema migrations
CREATE TABLE IF NOT EXISTS "organization" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "createdat" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS "membership" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationid" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "userid" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role" VARCHAR(255) NOT NULL,
  "createdat" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS "invitation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationid" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "email" VARCHAR(255) NOT NULL,
  "role" VARCHAR(255) NOT NULL,
  "token" VARCHAR(255) NOT NULL UNIQUE,
  "expiresat" TIMESTAMP WITH TIME ZONE NOT NULL
);

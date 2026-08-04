-- User and Session schema migrations
CREATE TABLE IF NOT EXISTS "user" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "name" VARCHAR(255),
  "createdat" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userid" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "token" VARCHAR(255) NOT NULL UNIQUE,
  "expiresat" TIMESTAMP WITH TIME ZONE NOT NULL
);

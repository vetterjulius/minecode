-- Entity: Profile (feature: authentication)
-- Application profile of an authenticated user (mirrors auth.users)
CREATE TABLE IF NOT EXISTS "profile" (
  "id" UUID PRIMARY KEY NOT NULL REFERENCES auth."users"("id") ON DELETE CASCADE,
  "email" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

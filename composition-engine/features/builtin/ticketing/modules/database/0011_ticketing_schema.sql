-- Ticketing feature schema migrations
CREATE TABLE IF NOT EXISTS "ticket" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" VARCHAR(255) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'open',
  "priority" VARCHAR(50) NOT NULL DEFAULT 'medium',
  "assigneeid" UUID,
  "organizationid" UUID NOT NULL,
  "createdat" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

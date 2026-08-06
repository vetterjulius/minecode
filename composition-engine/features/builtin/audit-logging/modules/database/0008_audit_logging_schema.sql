-- Audit Logging feature schema migrations
CREATE TABLE IF NOT EXISTS "auditlog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "action" VARCHAR(255) NOT NULL,
  "actorid" UUID,
  "entityname" VARCHAR(100),
  "entityid" VARCHAR(100),
  "payload" TEXT,
  "createdat" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

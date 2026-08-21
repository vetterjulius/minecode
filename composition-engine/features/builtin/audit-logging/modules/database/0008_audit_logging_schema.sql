-- Audit Logging feature schema migrations
CREATE TABLE IF NOT EXISTS "auditlog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "action" VARCHAR(255) NOT NULL,
  "actorId" UUID,
  "entityName" VARCHAR(100),
  "entityId" VARCHAR(100),
  "payload" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

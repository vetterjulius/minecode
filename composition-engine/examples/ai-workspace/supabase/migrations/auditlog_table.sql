-- SQL DDL for entity: AuditLog
-- Description: Audit log entry tracking security events
CREATE TABLE IF NOT EXISTS "auditlog" (
  "id" UUID PRIMARY KEY NOT NULL,
  "action" VARCHAR(255) NOT NULL,
  "actorId" UUID,
  "entityName" VARCHAR(255),
  "entityId" VARCHAR(255),
  "payload" VARCHAR(255),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

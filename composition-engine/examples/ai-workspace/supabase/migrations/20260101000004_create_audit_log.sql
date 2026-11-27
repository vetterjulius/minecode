-- Entity: AuditLog (feature: audit-logging)
-- Audit log entry tracking security events
CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "action" VARCHAR(255) NOT NULL,
  "actor_id" UUID REFERENCES "profile"("id") ON DELETE SET NULL,
  "entity_name" VARCHAR(255),
  "entity_id" VARCHAR(255),
  "payload" VARCHAR(255),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_audit_log_actor_id" ON "audit_log" ("actor_id");

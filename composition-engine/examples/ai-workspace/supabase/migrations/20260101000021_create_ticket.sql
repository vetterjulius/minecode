-- Entity: Ticket (feature: ticketing)
-- Customer support ticket tracking
CREATE TABLE IF NOT EXISTS "ticket" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(255) NOT NULL,
  "status" VARCHAR(255) NOT NULL DEFAULT 'open',
  "priority" VARCHAR(255) NOT NULL DEFAULT 'medium',
  "assignee_id" UUID REFERENCES "profile"("id") ON DELETE SET NULL,
  "organization_id" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_ticket_assignee_id" ON "ticket" ("assignee_id");
CREATE INDEX IF NOT EXISTS "idx_ticket_organization_id" ON "ticket" ("organization_id");

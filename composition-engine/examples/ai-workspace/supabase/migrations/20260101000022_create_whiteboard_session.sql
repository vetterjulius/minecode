-- Entity: WhiteboardSession (feature: whiteboard)
-- Collaborative whiteboard drawing session
CREATE TABLE IF NOT EXISTS "whiteboard_session" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "organization_id" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_whiteboard_session_organization_id" ON "whiteboard_session" ("organization_id");

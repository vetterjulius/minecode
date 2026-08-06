-- Whiteboard feature schema migrations
CREATE TABLE IF NOT EXISTS "whiteboardsession" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "organizationid" UUID NOT NULL,
  "createdat" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

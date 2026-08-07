-- SQL DDL for entity: WhiteboardSession
-- Description: Collaborative whiteboard drawing session
CREATE TABLE IF NOT EXISTS "whiteboardsession" (
  "id" UUID PRIMARY KEY NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "organizationId" UUID NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

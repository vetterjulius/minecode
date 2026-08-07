-- AI Chat feature schema migrations
CREATE TABLE IF NOT EXISTS "chatmessage" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionid" UUID NOT NULL,
  "role" VARCHAR(50) NOT NULL,
  "content" TEXT NOT NULL,
  "createdat" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

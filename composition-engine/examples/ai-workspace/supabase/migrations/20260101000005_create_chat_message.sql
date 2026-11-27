-- Entity: ChatMessage (feature: ai-chat)
-- Chat message log
CREATE TABLE IF NOT EXISTS "chat_message" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "role" VARCHAR(255) NOT NULL,
  "content" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "user_id" UUID NOT NULL DEFAULT auth.uid() REFERENCES "profile"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_chat_message_user_id" ON "chat_message" ("user_id");

-- Entity: Notification (feature: notifications)
-- Notification tracking and status
CREATE TABLE IF NOT EXISTS "notification" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "profile"("id") ON DELETE CASCADE,
  "channel" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "content" VARCHAR(255) NOT NULL,
  "status" VARCHAR(255) NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_notification_user_id" ON "notification" ("user_id");

-- Entity: Feedback (feature: customer-feedback)
-- Customer satisfaction rating and text feedback
CREATE TABLE IF NOT EXISTS "feedback" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "rating" INTEGER NOT NULL,
  "comment" VARCHAR(255),
  "user_id" UUID NOT NULL REFERENCES "profile"("id") ON DELETE CASCADE,
  "organization_id" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_feedback_organization_id" ON "feedback" ("organization_id");
CREATE INDEX IF NOT EXISTS "idx_feedback_user_id" ON "feedback" ("user_id");

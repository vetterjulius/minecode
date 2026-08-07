-- Customer Feedback feature schema migrations
CREATE TABLE IF NOT EXISTS "feedback" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "userid" UUID NOT NULL,
  "organizationid" UUID NOT NULL,
  "createdat" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

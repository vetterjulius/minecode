-- Customer Feedback feature schema migrations
CREATE TABLE IF NOT EXISTS "feedback" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "userId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

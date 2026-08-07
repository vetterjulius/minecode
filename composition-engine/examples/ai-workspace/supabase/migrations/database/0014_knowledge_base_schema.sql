-- Knowledge Base feature schema migrations
CREATE TABLE IF NOT EXISTS "article" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "authorid" UUID NOT NULL,
  "organizationid" UUID NOT NULL,
  "createdat" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

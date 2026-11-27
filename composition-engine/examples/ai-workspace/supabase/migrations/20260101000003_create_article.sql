-- Entity: Article (feature: knowledge-base)
-- Help center knowledge article
CREATE TABLE IF NOT EXISTS "article" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(255) NOT NULL,
  "content" VARCHAR(255) NOT NULL,
  "category" VARCHAR(255) NOT NULL,
  "author_id" UUID REFERENCES "profile"("id") ON DELETE SET NULL,
  "organization_id" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_article_author_id" ON "article" ("author_id");
CREATE INDEX IF NOT EXISTS "idx_article_organization_id" ON "article" ("organization_id");

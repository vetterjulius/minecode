-- Entity: Document (feature: documents)
-- App document
CREATE TABLE IF NOT EXISTS "document" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(255) NOT NULL,
  "content" TEXT,
  "project_id" UUID NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_document_project_id" ON "document" ("project_id");

-- Entity: File (feature: storage)
-- Uploaded file metadata tracking
CREATE TABLE IF NOT EXISTS "file" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "path" VARCHAR(255) NOT NULL,
  "size" INTEGER NOT NULL,
  "mime_type" VARCHAR(255) NOT NULL,
  "organization_id" UUID REFERENCES "organization"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_file_organization_id" ON "file" ("organization_id");

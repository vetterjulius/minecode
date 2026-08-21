-- Storage feature schema migrations
CREATE TABLE IF NOT EXISTS "file" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "path" VARCHAR(255) NOT NULL,
  "size" INTEGER NOT NULL,
  "mimeType" VARCHAR(255) NOT NULL,
  "organizationId" UUID,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

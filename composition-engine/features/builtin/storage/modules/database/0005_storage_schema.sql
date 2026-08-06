-- Storage feature schema migrations
CREATE TABLE IF NOT EXISTS "file" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "path" VARCHAR(255) NOT NULL,
  "size" INTEGER NOT NULL,
  "mimetype" VARCHAR(255) NOT NULL,
  "organizationid" UUID,
  "createdat" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

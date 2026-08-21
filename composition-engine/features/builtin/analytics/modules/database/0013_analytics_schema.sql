-- Analytics feature schema migrations
CREATE TABLE IF NOT EXISTS "metric" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "organizationId" UUID NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

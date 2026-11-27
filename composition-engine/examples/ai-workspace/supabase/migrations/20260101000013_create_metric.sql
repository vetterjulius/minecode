-- Entity: Metric (feature: analytics)
-- System metrics and resource usages
CREATE TABLE IF NOT EXISTS "metric" (
  "id" UUID PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "organization_id" UUID NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_metric_organization_id" ON "metric" ("organization_id");

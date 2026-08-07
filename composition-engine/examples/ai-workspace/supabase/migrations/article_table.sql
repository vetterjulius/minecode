-- SQL DDL for entity: Article
-- Description: Help center knowledge article
CREATE TABLE IF NOT EXISTS "article" (
  "id" UUID PRIMARY KEY NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "content" VARCHAR(255) NOT NULL,
  "category" VARCHAR(255) NOT NULL,
  "authorId" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

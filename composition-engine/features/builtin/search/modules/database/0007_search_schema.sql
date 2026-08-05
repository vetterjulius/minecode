-- Search feature schema migrations
-- Enables pg_trgm extension for fuzzy searching if supported
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

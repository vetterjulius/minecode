import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';

const SUPABASE_STUBS = `
CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE ROLE authenticated NOLOGIN;
GRANT USAGE ON SCHEMA public, auth TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
`;

export interface MigrationFailure {
  file: string;
  message: string;
}

export function listMigrationFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

export async function createSupabaseLikeDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { pg_trgm } });
  await db.exec(SUPABASE_STUBS);
  return db;
}

export async function applyMigrations(db: PGlite, dir: string): Promise<MigrationFailure[]> {
  const failures: MigrationFailure[] = [];
  for (const file of listMigrationFiles(dir)) {
    try {
      await db.exec(fs.readFileSync(path.join(dir, file), 'utf8'));
    } catch (error) {
      failures.push({ file, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return failures;
}

export async function asUser<T>(db: PGlite, userId: string, run: () => Promise<T>): Promise<T> {
  await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub = '${userId}';`);
  try {
    return await run();
  } finally {
    await db.exec(`RESET ROLE; RESET request.jwt.claim.sub;`);
  }
}

export async function expectDenied(run: () => Promise<unknown>): Promise<boolean> {
  try {
    await run();
    return false;
  } catch (error) {
    return error instanceof Error && /row-level security|permission denied/.test(error.message);
  }
}

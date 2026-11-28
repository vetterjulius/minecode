import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { findSqlFiles } from './files.mjs';

// Minimal Supabase-like environment, so migrations written for Supabase can run on plain PostgreSQL.
// Kept independent of the framework's own test stubs on purpose.
const SUPABASE_STUBS = `
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
`;

export async function createDb() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  return db;
}

/** Applies every SQL file of a workspace in path order; a failing file is recorded and skipped. */
export async function applyWorkspaceMigrations(db, workspace) {
  const files = findSqlFiles(workspace);
  const failures = [];
  for (const file of files) {
    try {
      await db.exec(fs.readFileSync(path.join(workspace, file), 'utf8'));
    } catch (error) {
      failures.push({ file, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { files, failures };
}

/**
 * Structural security facts about the resulting schema. They describe behaviour (is row level
 * security on, does a policy admit everyone), not names or layouts.
 */
export async function securityFacts(db) {
  const tables = await db.query(
    `SELECT c.relname AS name, c.relrowsecurity AS rls
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname`
  );
  const policies = await db.query(
    `SELECT tablename, policyname, cmd, roles::text AS roles, qual, with_check
       FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname`
  );
  const isOpen = (expr) => expr !== null && /^\(?\s*true\s*\)?$/i.test(expr.trim());
  const open = policies.rows.filter((p) => {
    const cmd = p.cmd;
    const readsOpen = (cmd === 'SELECT' || cmd === 'ALL') && isOpen(p.qual ?? '');
    const writesOpen =
      ['INSERT', 'UPDATE', 'DELETE', 'ALL'].includes(cmd) &&
      (isOpen(p.with_check ?? '') || (cmd !== 'INSERT' && isOpen(p.qual ?? '')));
    return readsOpen || writesOpen;
  });
  return {
    tableCount: tables.rows.length,
    tablesWithoutRls: tables.rows.filter((t) => !t.rls).map((t) => t.name),
    openPolicies: open.map((p) => `${p.tablename}.${p.policyname} (${p.cmd})`),
  };
}

/** Runs the database oracles on a saved workspace. */
export async function runDatabaseOracles(workspace) {
  const db = await createDb();
  try {
    const { files, failures } = await applyWorkspaceMigrations(db, workspace);
    if (files.length === 0) {
      return {
        migrationsApply: false,
        migrationFailures: [{ file: '', message: 'no SQL files found' }],
        security: null,
      };
    }
    return {
      migrationsApply: failures.length === 0,
      migrationFailures: failures,
      security: await securityFacts(db),
    };
  } finally {
    await db.close();
  }
}

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { findSqlFiles } from '../lib/files.mjs';
import { signJwt } from './jwt.mjs';
import { startGateway } from './gateway.mjs';

/**
 * Supabase's data plane on a throwaway machine: a real PostgreSQL, a real PostgREST and the
 * gateway from gateway.mjs. Applications reach it exactly as they reach Supabase (supabase-js
 * over HTTP), so row level security and the data API behave as in production. For a full
 * Supabase (GoTrue, Storage) run `supabase start` and point the tests at it instead.
 */

const BOOTSTRAP = `
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'authenticator';
GRANT anon, authenticated, service_role TO authenticator;
CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )
$$;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.role() TO anon, authenticated, service_role;
`;

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
    s.on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function findBinary(name, hints = []) {
  for (const dir of [...hints, ...(process.env.PATH ?? '').split(':')]) {
    if (dir && fs.existsSync(path.join(dir, name))) return path.join(dir, name);
  }
  return null;
}

export function locateTools() {
  const pgDirs = [
    '/usr/lib/postgresql/16/bin',
    '/usr/lib/postgresql/17/bin',
    '/usr/lib/postgresql/15/bin',
  ];
  return {
    initdb: process.env.INITDB ?? findBinary('initdb', pgDirs),
    pgCtl: process.env.PG_CTL ?? findBinary('pg_ctl', pgDirs),
    psql: process.env.PSQL ?? findBinary('psql', pgDirs),
    postgrest: process.env.POSTGREST ?? findBinary('postgrest'),
  };
}

export function toolsAvailable() {
  const t = locateTools();
  return Boolean(t.initdb && t.pgCtl && t.psql && t.postgrest);
}

export async function startDataPlane({
  migrationsFrom,
  jwtSecret = 'eval-secret-eval-secret-eval-secret-1234',
} = {}) {
  const tools = locateTools();
  if (!toolsAvailable()) throw new Error('initdb, pg_ctl, psql and postgrest are required');

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-dataplane-'));
  const dataDir = path.join(root, 'pg');
  const asRoot = process.getuid?.() === 0;
  // PostgreSQL refuses to run as root; use the postgres account when we are root.
  const wrap = (cmd, args) =>
    asRoot ? ['runuser', ['-u', 'postgres', '--', cmd, ...args]] : [cmd, args];
  if (asRoot) fs.chmodSync(root, 0o777);

  const run = (cmd, args, opts = {}) => {
    const [c, a] = wrap(cmd, args);
    const r = spawnSync(c, a, { encoding: 'utf8', ...opts });
    if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr || r.stdout}`);
    return r;
  };

  const pgPort = await freePort();
  run(tools.initdb, ['-D', dataDir, '-A', 'trust', '-U', 'postgres', '-E', 'UTF8']);
  run(tools.pgCtl, [
    '-D',
    dataDir,
    '-w',
    '-l',
    path.join(root, 'pg.log'),
    '-o',
    `-p ${pgPort} -k ${root} -c listen_addresses=127.0.0.1 -c fsync=off`,
    'start',
  ]);

  const psql = (sqlOrFile, { file = false, db = 'postgres' } = {}) =>
    spawnSync(
      tools.psql,
      [
        '-h',
        '127.0.0.1',
        '-p',
        String(pgPort),
        '-U',
        'postgres',
        '-d',
        db,
        '-v',
        'ON_ERROR_STOP=1',
        '-q',
        ...(file ? ['-f', sqlOrFile] : ['-c', sqlOrFile]),
      ],
      { encoding: 'utf8' }
    );
  const mustPsql = (...args) => {
    const r = psql(...args);
    if (r.status !== 0) throw new Error(`psql failed: ${r.stderr}`);
    return r.stdout;
  };

  mustPsql(BOOTSTRAP);
  const migrationFailures = [];
  if (migrationsFrom) {
    for (const file of findSqlFiles(migrationsFrom)) {
      const r = psql(path.join(migrationsFrom, file), { file: true });
      if (r.status !== 0) migrationFailures.push({ file, message: r.stderr.trim() });
    }
  }

  const restPort = await freePort();
  const rest = spawn(tools.postgrest, [], {
    env: {
      ...process.env,
      PGRST_DB_URI: `postgres://authenticator:authenticator@127.0.0.1:${pgPort}/postgres`,
      PGRST_DB_SCHEMAS: 'public',
      PGRST_DB_ANON_ROLE: 'anon',
      PGRST_JWT_SECRET: jwtSecret,
      PGRST_SERVER_PORT: String(restPort),
      PGRST_SERVER_HOST: '127.0.0.1',
      PGRST_LOG_LEVEL: 'warn',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let restLog = '';
  rest.stderr.on('data', (d) => (restLog += d));
  rest.stdout.on('data', (d) => (restLog += d));
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${restPort}/`);
      if (r.status < 500) break;
    } catch {
      // not up yet
    }
    if (i > 100) throw new Error(`PostgREST did not start:\n${restLog}`);
    await sleep(100);
  }

  const gateway = await startGateway({ postgrestPort: restPort, jwtSecret });
  const url = `http://127.0.0.1:${gateway.port}`;
  const token = (claims) =>
    signJwt(
      { aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, ...claims },
      jwtSecret
    );

  return {
    url,
    anonKey: token({ role: 'anon', aud: undefined }),
    serviceKey: token({ role: 'service_role', aud: undefined }),
    migrationFailures,
    sql: (statement) => mustPsql(statement),
    /** Creates a user and returns the session cookie an @supabase/ssr app expects. */
    createUser(email) {
      const out = mustPsql(
        `INSERT INTO auth.users (email) VALUES ('${email}') RETURNING id;`
      ).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/)?.[0];
      if (!out) throw new Error('could not create user');
      const accessToken = token({ sub: out, role: 'authenticated', email });
      const session = {
        access_token: accessToken,
        refresh_token: 'unused',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: out, aud: 'authenticated', role: 'authenticated', email },
      };
      const ref = new URL(url).hostname.split('.')[0];
      return {
        id: out,
        email,
        accessToken,
        cookie: `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`,
      };
    },
    async stop() {
      await gateway.close();
      rest.kill('SIGTERM');
      try {
        run(tools.pgCtl, ['-D', dataDir, '-m', 'immediate', 'stop']);
      } catch {
        // already stopped
      }
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

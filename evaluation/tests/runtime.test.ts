import { afterAll, beforeAll, describe, expect, test } from 'vitest';
// @ts-expect-error plain ESM modules without type declarations
import { startDataPlane, toolsAvailable } from '../harness/runtime/data-plane.mjs';
// @ts-expect-error plain ESM modules without type declarations
import { copyWorkspace, installAndBuild, startApp } from '../harness/runtime/app-process.mjs';

/**
 * Validates the runtime harness itself against one known Supabase application (the repository's
 * generated example). Slow (installs and builds the app) and needs PostgreSQL and PostgREST, so
 * it runs only when MINECODE_EVAL_APP points at an application workspace and the tools exist:
 *
 *   MINECODE_EVAL_APP=composition-engine/examples/ai-workspace POSTGREST=/path/to/postgrest pnpm vitest run evaluation/tests/runtime.test.ts
 *
 * The scenario is specific to that app's API; real acceptance suites are written per task.
 */
const APP = process.env.MINECODE_EVAL_APP;
const enabled = Boolean(APP) && toolsAvailable();

interface Actor {
  id: string;
  email: string;
  cookie: string;
}

describe.runIf(enabled)('running application on real PostgreSQL and PostgREST', () => {
  let plane: Awaited<ReturnType<typeof startDataPlane>>;
  let app: Awaited<ReturnType<typeof startApp>>;
  let alice: Actor;
  let bob: Actor;
  const ids: { org?: string; workspace?: string; project?: string } = {};

  const call = async (who: Actor | null, method: string, path: string, body?: unknown) => {
    const response = await fetch(app.base + path, {
      method,
      headers: { ...(who ? { cookie: who.cookie } : {}), 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await response.json().catch(() => null);
    return { status: response.status, json };
  };

  beforeAll(async () => {
    plane = await startDataPlane({ migrationsFrom: APP });
    expect(plane.migrationFailures).toEqual([]);
    const dir = copyWorkspace(APP);
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: plane.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: plane.anonKey,
      NEXT_TELEMETRY_DISABLED: '1',
    };
    installAndBuild(dir, env);
    app = await startApp(dir, { port: 3000 + Math.floor(Math.random() * 2000), env });
    alice = plane.createUser('alice@example.com');
    bob = plane.createUser('bob@example.com');
  }, 600_000);

  afterAll(async () => {
    app?.stop();
    await plane?.stop();
  });

  test('test_Owner_CreatesOrganizationWorkspaceAndProject', async () => {
    const org = await call(alice, 'POST', '/api/organizations', { name: 'Acme' });
    expect(org.status).toBe(200);
    ids.org = org.json.data.id;
    const ws = await call(alice, 'POST', '/api/workspaces', {
      name: 'W',
      organization_id: ids.org,
    });
    expect(ws.status).toBe(200);
    ids.workspace = ws.json.data.id;
    const project = await call(alice, 'POST', '/api/projects', {
      name: 'P1',
      organization_id: ids.org,
      workspace_id: ids.workspace,
    });
    expect(project.status).toBe(200);
    ids.project = project.json.data.id;
  });

  test('test_Anonymous_IsRejected', async () => {
    expect((await call(null, 'GET', '/api/projects')).status).toBe(401);
  });

  test('test_UserWithoutMembership_IsRefusedByPermissionCheck', async () => {
    expect((await call(bob, 'GET', '/api/projects')).status).toBe(403);
    expect(
      (
        await call(bob, 'POST', '/api/projects', {
          name: 'x',
          organization_id: ids.org,
          workspace_id: ids.workspace,
        })
      ).status
    ).toBe(403);
  });

  test('test_OtherTenantMember_CannotSeeOrChangeForeignRows', async () => {
    // Bob founds his own organization, so the permission check passes and row level security decides.
    const bobOrg = await call(bob, 'POST', '/api/organizations', { name: 'Bobs' });
    expect(bobOrg.status).toBe(200);

    const list = await call(bob, 'GET', '/api/projects');
    expect(list.status).toBe(200);
    expect(list.json.data).toEqual([]);

    expect((await call(bob, 'GET', `/api/projects/${ids.project}`)).status).toBe(404);
    expect(
      (await call(bob, 'PATCH', `/api/projects/${ids.project}`, { name: 'hacked' })).status
    ).toBe(404);
    expect((await call(bob, 'DELETE', `/api/projects/${ids.project}`)).status).toBe(404);

    const intoForeignOrg = await call(bob, 'POST', '/api/projects', {
      name: 'evil',
      organization_id: ids.org,
      workspace_id: ids.workspace,
    });
    expect(intoForeignOrg.status).not.toBe(200);

    const mine = await call(alice, 'GET', `/api/projects/${ids.project}`);
    expect(mine.json.data.name).toBe('P1'); // untouched
  });

  test('test_Owner_UpdatesAndDeletesOwnProject', async () => {
    const patched = await call(alice, 'PATCH', `/api/projects/${ids.project}`, {
      name: 'P1 renamed',
    });
    expect(patched.json.data.name).toBe('P1 renamed');
    expect((await call(alice, 'DELETE', `/api/projects/${ids.project}`)).status).toBe(200);
    expect((await call(alice, 'GET', `/api/projects/${ids.project}`)).status).toBe(404);
  });
});

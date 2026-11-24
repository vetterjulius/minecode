import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import {
  applyMigrations,
  asUser,
  createSupabaseLikeDb,
  expectDenied,
  listMigrationFiles,
} from '../support/supabase-db.js';

const EXAMPLES = path.resolve(__dirname, '../../../../examples');
const MIGRATIONS = path.join(EXAMPLES, 'ai-workspace/supabase/migrations');

const ALICE = '00000000-0000-0000-0000-00000000000a';
const BOB = '00000000-0000-0000-0000-00000000000b';
const ORG_A = '10000000-0000-0000-0000-00000000000a';
const ORG_B = '10000000-0000-0000-0000-00000000000b';
const PROJECT_A = '20000000-0000-0000-0000-00000000000a';

async function seed(db: PGlite): Promise<void> {
  await db.exec(`
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
      ('${ALICE}', 'alice@example.com', '{"name":"Alice"}'),
      ('${BOB}', 'bob@example.com', '{}');
    INSERT INTO organization (id, name) VALUES ('${ORG_A}', 'A'), ('${ORG_B}', 'B');
    INSERT INTO membership (organization_id, user_id, role) VALUES
      ('${ORG_A}', '${ALICE}', 'admin'), ('${ORG_B}', '${BOB}', 'admin');
    INSERT INTO workspace (organization_id, name) VALUES ('${ORG_A}', 'ws');
    INSERT INTO project (id, name, organization_id, workspace_id, status)
      SELECT '${PROJECT_A}', 'p', '${ORG_A}', id, 'open' FROM workspace LIMIT 1;
    INSERT INTO task (title, project_id, status, priority) VALUES ('t', '${PROJECT_A}', 'open', 'medium');
  `);
}

describe('generated migrations on PostgreSQL', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createSupabaseLikeDb();
  });

  test('test_AiWorkspaceMigrations_AppliedInFilenameOrder_AllSucceed', async () => {
    expect(await applyMigrations(db, MIGRATIONS)).toEqual([]);
    await seed(db);
  });

  test('test_AiWorkspaceMigrations_AppliedTwice_AreIdempotent', async () => {
    expect(await applyMigrations(db, MIGRATIONS)).toEqual([]);
  });

  test('test_MigrationFilenames_Listed_MatchSupabaseTimestampPattern', () => {
    for (const file of listMigrationFiles(MIGRATIONS)) {
      expect(file).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
    }
  });

  test('test_AuthUserInserted_ProfileTrigger_CreatesProfileWithMetadataName', async () => {
    const { rows } = await db.query<{ name: string | null }>(
      `SELECT name FROM profile WHERE id = '${ALICE}'`
    );
    expect(rows).toEqual([{ name: 'Alice' }]);
  });

  test('test_TenantTable_ReadAsMember_ReturnsOnlyOwnOrganization', async () => {
    const rows = await asUser(
      db,
      ALICE,
      async () => (await db.query('SELECT name FROM organization')).rows
    );
    expect(rows).toEqual([{ name: 'A' }]);
  });

  test('test_TenantTable_ReadAsNonMember_ReturnsNoRows', async () => {
    const rows = await asUser(
      db,
      BOB,
      async () => (await db.query('SELECT * FROM workspace')).rows
    );
    expect(rows).toEqual([]);
  });

  test('test_ServerOnlyTable_InsertAsMember_IsDenied', async () => {
    const denied = await asUser(db, ALICE, () =>
      expectDenied(() => db.exec(`INSERT INTO organization (name) VALUES ('evil')`))
    );
    expect(denied).toBe(true);
  });

  test('test_ServerOnlyTable_MembershipSelfPromotion_IsDenied', async () => {
    const denied = await asUser(db, BOB, () =>
      expectDenied(() =>
        db.exec(
          `INSERT INTO membership (organization_id, user_id, role) VALUES ('${ORG_A}', '${BOB}', 'admin')`
        )
      )
    );
    expect(denied).toBe(true);
  });

  test('test_TenantTable_InsertIntoForeignOrganization_IsDenied', async () => {
    const denied = await asUser(db, BOB, () =>
      expectDenied(() =>
        db.exec(`INSERT INTO workspace (organization_id, name) VALUES ('${ORG_A}', 'x')`)
      )
    );
    expect(denied).toBe(true);
  });

  test('test_TenantTable_InsertIntoOwnOrganization_IsAllowed', async () => {
    await asUser(db, BOB, () =>
      db.exec(`INSERT INTO workspace (organization_id, name) VALUES ('${ORG_B}', 'bobs')`)
    );
    const { rows } = await db.query(`SELECT 1 FROM workspace WHERE name = 'bobs'`);
    expect(rows).toHaveLength(1);
  });

  test('test_ViaParentTable_ReadAsMemberOfParentOrganization_ReturnsTask', async () => {
    const rows = await asUser(
      db,
      ALICE,
      async () => (await db.query('SELECT title FROM task')).rows
    );
    expect(rows).toEqual([{ title: 't' }]);
  });

  test('test_ViaParentTable_ReadAsOutsider_ReturnsNoRows', async () => {
    const rows = await asUser(db, BOB, async () => (await db.query('SELECT title FROM task')).rows);
    expect(rows).toEqual([]);
  });

  test('test_ViaParentTable_InsertForForeignProject_IsDenied', async () => {
    const denied = await asUser(db, BOB, () =>
      expectDenied(() =>
        db.exec(
          `INSERT INTO task (title, project_id, status, priority) VALUES ('x', '${PROJECT_A}', 'open', 'low')`
        )
      )
    );
    expect(denied).toBe(true);
  });

  test('test_OwnerTable_InsertWithoutUserId_DefaultsToAuthenticatedUser', async () => {
    await asUser(db, ALICE, () =>
      db.exec(
        `INSERT INTO chat_message (session_id, role, content) VALUES (gen_random_uuid(), 'user', 'hi')`
      )
    );
    const { rows } = await db.query<{ user_id: string }>('SELECT user_id FROM chat_message');
    expect(rows).toEqual([{ user_id: ALICE }]);
  });

  test('test_OwnerTable_ReadAsOtherUser_ReturnsNoRows', async () => {
    const rows = await asUser(
      db,
      BOB,
      async () => (await db.query('SELECT * FROM chat_message')).rows
    );
    expect(rows).toEqual([]);
  });

  test('test_OwnerTable_InsertForOtherUser_IsDenied', async () => {
    const denied = await asUser(db, BOB, () =>
      expectDenied(() =>
        db.exec(
          `INSERT INTO chat_message (session_id, role, content, user_id) VALUES (gen_random_uuid(), 'user', 'x', '${ALICE}')`
        )
      )
    );
    expect(denied).toBe(true);
  });

  test('test_InsertOnlyTable_UpdateAsActor_AffectsNoRows', async () => {
    await asUser(db, ALICE, () =>
      db.exec(
        `INSERT INTO audit_log (action, actor_id, entity_name, entity_id, payload) VALUES ('a', '${ALICE}', 'e', '1', '{}')`
      )
    );
    const result = await asUser(db, ALICE, () =>
      db.query(`UPDATE audit_log SET action = 'tampered'`)
    );
    expect(result.affectedRows).toBe(0);
  });

  test('test_InsertOnlyTable_DeleteAsActor_AffectsNoRows', async () => {
    const result = await asUser(db, ALICE, () => db.query('DELETE FROM audit_log'));
    expect(result.affectedRows).toBe(0);
  });

  test('test_AuthenticatedReadTable_ReadAsAnyUser_ReturnsRows', async () => {
    await db.exec(`INSERT INTO role (name) VALUES ('admin')`);
    const rows = await asUser(db, BOB, async () => (await db.query('SELECT name FROM role')).rows);
    expect(rows).toEqual([{ name: 'admin' }]);
  });

  test('test_AuthenticatedReadTable_InsertAsUser_IsDenied', async () => {
    const denied = await asUser(db, BOB, () =>
      expectDenied(() => db.exec(`INSERT INTO role (name) VALUES ('root')`))
    );
    expect(denied).toBe(true);
  });

  test('test_ProfileTable_ReadOtherUsersProfile_ReturnsNoRows', async () => {
    const rows = await asUser(
      db,
      BOB,
      async () => (await db.query(`SELECT id FROM profile WHERE id = '${ALICE}'`)).rows
    );
    expect(rows).toEqual([]);
  });

  test('test_EveryTable_Inspected_HasRowLevelSecurityEnabled', async () => {
    const { rows } = await db.query<{ relname: string }>(
      `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity`
    );
    expect(rows).toEqual([]);
  });
});

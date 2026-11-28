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
    const rows = await asUser(
      db,
      BOB,
      async () => (await db.query('SELECT name FROM role ORDER BY name')).rows
    );
    expect(rows).toEqual([
      { name: 'admin' },
      { name: 'guest' },
      { name: 'member' },
      { name: 'owner' },
    ]);
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

  describe('role based permissions', () => {
    const CAROL = '00000000-0000-0000-0000-00000000000c';
    const DAVE = '00000000-0000-0000-0000-00000000000d';

    beforeAll(async () => {
      await db.exec(`
        INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
          ('${CAROL}', 'carol@example.com', '{}'), ('${DAVE}', 'dave@example.com', '{}');
        INSERT INTO membership (organization_id, user_id, role) VALUES
          ('${ORG_A}', '${CAROL}', 'guest'), ('${ORG_A}', '${DAVE}', 'member');
      `);
    });

    test('test_Seed_Applied_GrantsEveryPermissionToOwner', async () => {
      const { rows } = await db.query<{ missing: string }>(
        `SELECT p.name AS missing FROM permission p
         WHERE NOT EXISTS (SELECT 1 FROM role_permission rp WHERE rp.role = 'owner' AND rp.permission = p.name)`
      );
      expect(rows).toEqual([]);
    });

    test('test_Seed_Applied_KeepsBillingAndRbacWritesAwayFromMembers', async () => {
      const { rows } = await db.query<{ permission: string }>(
        `SELECT permission FROM role_permission
         WHERE role = 'member' AND (permission LIKE 'billing.%' OR permission LIKE 'rbac.%')`
      );
      expect(rows).toEqual([]);
    });

    test('test_PermissionGatedTable_ReadAsRoleWithReadPermission_ReturnsRows', async () => {
      const rows = await asUser(
        db,
        CAROL,
        async () => (await db.query('SELECT name FROM workspace')).rows
      );
      expect(rows).toEqual([{ name: 'ws' }]);
    });

    test('test_PermissionGatedTable_InsertAsReadOnlyRole_IsDenied', async () => {
      const denied = await asUser(db, CAROL, () =>
        expectDenied(() =>
          db.exec(`INSERT INTO workspace (organization_id, name) VALUES ('${ORG_A}', 'guest-ws')`)
        )
      );
      expect(denied).toBe(true);
    });

    test('test_PermissionGatedTable_InsertAsRoleWithWritePermission_IsAllowed', async () => {
      await asUser(db, DAVE, () =>
        db.exec(`INSERT INTO workspace (organization_id, name) VALUES ('${ORG_A}', 'member-ws')`)
      );
      const { rows } = await db.query(`SELECT 1 FROM workspace WHERE name = 'member-ws'`);
      expect(rows).toHaveLength(1);
    });

    test('test_PermissionGatedTable_UpdateAsReadOnlyRole_AffectsNoRows', async () => {
      const result = await asUser(db, CAROL, () =>
        db.query(`UPDATE workspace SET name = 'renamed' WHERE organization_id = '${ORG_A}'`)
      );
      expect(result.affectedRows).toBe(0);
    });

    test('test_ChildTableViaParent_InsertAsReadOnlyRole_IsDenied', async () => {
      const denied = await asUser(db, CAROL, () =>
        expectDenied(() =>
          db.exec(
            `INSERT INTO task (title, project_id, status, priority) VALUES ('x', '${PROJECT_A}', 'open', 'low')`
          )
        )
      );
      expect(denied).toBe(true);
    });

    test('test_ChildTableViaParent_InsertAsRoleWithWritePermission_IsAllowed', async () => {
      await asUser(db, DAVE, () =>
        db.exec(
          `INSERT INTO task (title, project_id, status, priority) VALUES ('by-member', '${PROJECT_A}', 'open', 'low')`
        )
      );
      const { rows } = await db.query(`SELECT 1 FROM task WHERE title = 'by-member'`);
      expect(rows).toHaveLength(1);
    });

    test('test_PermissionGatedTable_RevokedGrant_StopsAccessImmediately', async () => {
      await db.exec(
        `DELETE FROM role_permission WHERE role = 'guest' AND permission = 'workspace.read'`
      );
      const rows = await asUser(
        db,
        CAROL,
        async () => (await db.query('SELECT name FROM workspace')).rows
      );
      expect(rows).toEqual([]);
      await db.exec(
        `INSERT INTO role_permission (role, permission) VALUES ('guest', 'workspace.read')`
      );
    });

    test('test_Seed_ReapplyAfterManualGrant_KeepsManualGrant', async () => {
      await db.exec(
        `INSERT INTO role_permission (role, permission) VALUES ('guest', 'workspace.write') ON CONFLICT DO NOTHING`
      );
      expect(await applyMigrations(db, MIGRATIONS)).toEqual([]);
      const { rows } = await db.query(
        `SELECT 1 FROM role_permission WHERE role = 'guest' AND permission = 'workspace.write'`
      );
      expect(rows).toHaveLength(1);
      await db.exec(
        `DELETE FROM role_permission WHERE role = 'guest' AND permission = 'workspace.write'`
      );
    });
  });

  describe('my_permissions', () => {
    test('test_MyPermissions_AsAdmin_ListsGrantsOfOwnOrganizationOnly', async () => {
      const rows = await asUser(
        db,
        ALICE,
        async () =>
          (
            await db.query<{ organization_id: string; permission: string }>(
              `SELECT * FROM my_permissions()`
            )
          ).rows
      );
      expect(rows.length).toBeGreaterThan(0);
      expect(new Set(rows.map((r) => r.organization_id))).toEqual(new Set([ORG_A]));
      expect(rows.some((r) => r.permission === 'project.write')).toBe(true);
      expect(rows.some((r) => r.permission === 'rbac.write')).toBe(false); // admin default
    });

    test('test_MyPermissions_AsStranger_IsEmpty', async () => {
      const rows = await asUser(
        db,
        '00000000-0000-0000-0000-0000000000ff',
        async () => (await db.query(`SELECT * FROM my_permissions()`)).rows
      );
      expect(rows).toEqual([]);
    });
  });

  describe('accept_invitation', () => {
    const GINA = '00000000-0000-0000-0000-000000000a01';
    const HANK = '00000000-0000-0000-0000-000000000a02';
    const ORG = '10000000-0000-0000-0000-0000000000a1';

    beforeAll(async () => {
      await db.exec(`
        INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
          ('${GINA}', 'Gina@Example.com', '{}'), ('${HANK}', 'hank@example.com', '{}');
        INSERT INTO organization (id, name) VALUES ('${ORG}', 'Invite Inc');
      `);
    });

    const invite = (token: string, email: string, extra = '', role = 'member') =>
      db.exec(
        `INSERT INTO invitation (organization_id, email, role, token, expires_at)
         VALUES ('${ORG}', '${email}', '${role}', '${token}', now() + interval '1 day') ${extra}`
      );
    const accept = (user: string, token: string) =>
      asUser(db, user, () => db.query(`SELECT * FROM accept_invitation('${token}')`));

    test('test_AcceptInvitation_WithMatchingEmail_CreatesMembershipWithInvitedRole', async () => {
      await invite('tok-ok', 'gina@example.com');
      const { rows } = await accept(GINA, 'tok-ok');
      expect(rows[0]).toMatchObject({ organization_id: ORG, user_id: GINA, role: 'member' });
    });

    test('test_AcceptInvitation_SecondUse_IsRejected', async () => {
      await expect(accept(GINA, 'tok-ok')).rejects.toThrow(/already used/);
    });

    test('test_AcceptInvitation_ForDifferentEmail_IsDenied', async () => {
      await invite('tok-other', 'someone-else@example.com');
      await expect(accept(HANK, 'tok-other')).rejects.toThrow(/different email/);
      const { rows } = await db.query(`SELECT 1 FROM membership WHERE user_id = '${HANK}'`);
      expect(rows).toEqual([]);
    });

    test('test_AcceptInvitation_Expired_IsRejected', async () => {
      await db.exec(
        `INSERT INTO invitation (organization_id, email, role, token, expires_at)
         VALUES ('${ORG}', 'hank@example.com', 'member', 'tok-old', now() - interval '1 day')`
      );
      await expect(accept(HANK, 'tok-old')).rejects.toThrow(/expired/);
    });

    test('test_AcceptInvitation_UnknownToken_IsRejected', async () => {
      await expect(accept(HANK, 'nope')).rejects.toThrow(/Invalid invitation/);
    });

    test('test_AcceptInvitation_UnknownRole_IsRejected', async () => {
      await invite('tok-role', 'hank@example.com', '', 'superuser');
      await expect(accept(HANK, 'tok-role')).rejects.toThrow(/unknown role/);
    });

    test('test_AcceptInvitation_WithoutAuthenticatedUser_IsDenied', async () => {
      await expect(db.query(`SELECT accept_invitation('x')`)).rejects.toThrow(
        /Authentication required/
      );
    });
  });

  describe('organization functions', () => {
    const EVE = '00000000-0000-0000-0000-00000000000e';
    const FRANK = '00000000-0000-0000-0000-00000000000f';
    let orgId: string;

    beforeAll(async () => {
      await db.exec(`
        INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
          ('${EVE}', 'eve@example.com', '{}'), ('${FRANK}', 'frank@example.com', '{}');
      `);
      orgId = await asUser(db, EVE, async () => {
        const { rows } = await db.query<{ id: string }>(
          `SELECT id FROM create_organization('Eve Inc')`
        );
        return rows[0].id;
      });
      await db.exec(
        `INSERT INTO membership (organization_id, user_id, role) VALUES ('${orgId}', '${FRANK}', 'member')`
      );
    });

    const roleOf = async (user: string) =>
      (
        await db.query<{ role: string }>(
          `SELECT role FROM membership WHERE organization_id = '${orgId}' AND user_id = '${user}'`
        )
      ).rows[0].role;

    test('test_CreateOrganization_AsAuthenticatedUser_MakesCallerOwner', async () => {
      expect(await roleOf(EVE)).toBe('owner');
      const visible = await asUser(
        db,
        EVE,
        async () => (await db.query(`SELECT 1 FROM organization WHERE id = '${orgId}'`)).rows
      );
      expect(visible).toHaveLength(1);
    });

    test('test_CreateOrganization_WithoutAuthenticatedUser_IsDenied', async () => {
      await expect(db.query(`SELECT create_organization('Ghost')`)).rejects.toThrow(
        /Authentication required/
      );
    });

    test('test_ChangeMemberRole_AsMemberWithoutRbacWrite_IsDenied', async () => {
      await expect(
        asUser(db, FRANK, () =>
          db.query(`SELECT change_member_role('${orgId}', '${FRANK}', 'owner')`)
        )
      ).rejects.toThrow(/Not allowed to change roles/);
      expect(await roleOf(FRANK)).toBe('member');
    });

    test('test_ChangeMemberRole_AsOwner_ChangesRole', async () => {
      await asUser(db, EVE, () =>
        db.query(`SELECT change_member_role('${orgId}', '${FRANK}', 'admin')`)
      );
      expect(await roleOf(FRANK)).toBe('admin');
    });

    test('test_ChangeMemberRole_UnknownRole_IsRejected', async () => {
      await expect(
        asUser(db, EVE, () =>
          db.query(`SELECT change_member_role('${orgId}', '${FRANK}', 'wizard')`)
        )
      ).rejects.toThrow(/Unknown role/);
    });

    test('test_ChangeMemberRole_DemotingLastOwner_IsRejected', async () => {
      await expect(
        asUser(db, EVE, () => db.query(`SELECT change_member_role('${orgId}', '${EVE}', 'member')`))
      ).rejects.toThrow(/at least one owner/);
      expect(await roleOf(EVE)).toBe('owner');
    });

    test('test_ChangeMemberRole_OwnerOfOtherOrganization_CannotTouchThisOne', async () => {
      await expect(
        asUser(db, BOB, () =>
          db.query(`SELECT change_member_role('${orgId}', '${FRANK}', 'owner')`)
        )
      ).rejects.toThrow(/Not allowed to change roles/);
    });
  });
});

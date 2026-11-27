import { CompositionPlan, DatabaseArtifact, EntityField } from '@minecode/core';
import { describe, expect, test } from 'vitest';
import { buildCreateTable, indexedColumns } from '../../../src/generators/database/ddl.js';
import { SchemaGenerationError } from '../../../src/generators/database/errors.js';
import { SupabaseDatabaseSubGenerator } from '../../../src/generators/database/index.js';
import {
  MigrationSequence,
  migrationTimestamp,
} from '../../../src/generators/database/migration-files.js';
import { slugify, toSnakeCase } from '../../../src/generators/database/naming.js';
import { orderByReferences } from '../../../src/generators/database/ordering.js';
import { buildPolicies } from '../../../src/generators/database/rls.js';
import { validateSchemaPlan } from '../../../src/generators/database/validate.js';

function entity(
  name: string,
  fields: EntityField[],
  access?: DatabaseArtifact['access']
): DatabaseArtifact {
  return { id: `f:${name}`, featureId: 'f', entityName: name, fields, access };
}

const ID: EntityField = { name: 'id', type: 'uuid', required: true, generate: 'uuid' };

function planOf(entities: DatabaseArtifact[], migrations: CompositionPlan['migrations'] = []) {
  return {
    applicationName: 'T',
    stackId: 'nextjs-supabase',
    database: entities,
    api: [],
    ui: [],
    navigation: [],
    events: [],
    permissions: [],
    migrations,
    extensionPoints: [],
  } as CompositionPlan;
}

const ORG = entity('Organization', [ID, { name: 'name', type: 'string', required: true }], {
  scope: 'tenant',
  field: 'id',
  writes: 'server-only',
});
const PROFILE = entity('Profile', [ID], { scope: 'owner', field: 'id' });
const MEMBERSHIP = entity(
  'Membership',
  [
    ID,
    {
      name: 'organizationId',
      type: 'uuid',
      required: true,
      references: { entity: 'Organization' },
    },
    { name: 'userId', type: 'uuid', required: true, references: { entity: 'Profile' } },
  ],
  { scope: 'tenant', field: 'organizationId', writes: 'server-only' }
);
const TENANT_BASE = [ORG, PROFILE, MEMBERSHIP];

describe('naming', () => {
  test.each([
    ['organizationId', 'organization_id'],
    ['createdAt', 'created_at'],
    ['userID', 'user_id'],
    ['HTMLParser', 'html_parser'],
    ['id', 'id'],
    ['StripeCustomer', 'stripe_customer'],
    ['already_snake', 'already_snake'],
  ])('test_ToSnakeCase_%s_Returns_%s', (input, expected) => {
    expect(toSnakeCase(input)).toBe(expected);
  });

  test.each([
    ['0005_storage_schema.sql', 'storage_schema'],
    ['database/0001_auth.sql', 'auth'],
    ['Weird Name!.sql', 'weird_name'],
  ])('test_Slugify_%s_Returns_%s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('migration files', () => {
  test('test_MigrationTimestamp_Indices_AreStrictlyIncreasingFixedWidth', () => {
    expect(migrationTimestamp(0)).toBe('20260101000000');
    expect(migrationTimestamp(61)).toBe('20260101000101');
    expect(migrationTimestamp(3)).toHaveLength(14);
  });

  test('test_MigrationSequence_AddedInOrder_UsesFlatTimestampedPaths', () => {
    const seq = new MigrationSequence();
    seq.add('a', 'A');
    seq.add('b', 'B');
    expect(Object.keys(seq.toFiles())).toEqual([
      'supabase/migrations/20260101000000_a.sql',
      'supabase/migrations/20260101000001_b.sql',
    ]);
  });
});

describe('ordering', () => {
  test('test_OrderByReferences_ChildListedFirst_ParentComesFirst', () => {
    const ordered = orderByReferences([MEMBERSHIP, PROFILE, ORG]).map((e) => e.entityName);
    expect(ordered.indexOf('Organization')).toBeLessThan(ordered.indexOf('Membership'));
    expect(ordered.indexOf('Profile')).toBeLessThan(ordered.indexOf('Membership'));
  });

  test('test_OrderByReferences_SameInputDifferentOrder_ProducesSameOutput', () => {
    const a = orderByReferences([MEMBERSHIP, PROFILE, ORG]).map((e) => e.entityName);
    const b = orderByReferences([ORG, MEMBERSHIP, PROFILE]).map((e) => e.entityName);
    expect(a).toEqual(b);
  });

  test('test_OrderByReferences_CircularReference_ThrowsWithCycleDescription', () => {
    const a = entity('A', [ID, { name: 'bId', type: 'uuid', references: { entity: 'B' } }]);
    const b = entity('B', [ID, { name: 'aId', type: 'uuid', references: { entity: 'A' } }]);
    expect(() => orderByReferences([a, b])).toThrow(/Circular entity reference: A -> B -> A/);
  });

  test('test_OrderByReferences_SelfReference_IsAllowed', () => {
    const tree = entity('Node', [
      ID,
      { name: 'parentId', type: 'uuid', references: { entity: 'Node' } },
    ]);
    expect(orderByReferences([tree])).toHaveLength(1);
  });
});

describe('validation', () => {
  test('test_ValidateSchemaPlan_ValidTenantSetup_DoesNotThrow', () => {
    expect(() => validateSchemaPlan(TENANT_BASE)).not.toThrow();
  });

  test('test_ValidateSchemaPlan_DuplicateEntityFromTwoFeatures_Throws', () => {
    expect(() => validateSchemaPlan([PROFILE, { ...PROFILE, featureId: 'other' }])).toThrow(
      /already provided by feature 'f'/
    );
  });

  test('test_ValidateSchemaPlan_ReferenceToMissingEntity_NamesTheMissingEntity', () => {
    const orphan = entity('Orphan', [
      ID,
      { name: 'ghostId', type: 'uuid', references: { entity: 'Ghost' } },
    ]);
    expect(() => validateSchemaPlan([orphan])).toThrow(/references entity 'Ghost'/);
  });

  test('test_ValidateSchemaPlan_ReferenceToMissingColumn_Throws', () => {
    const bad = entity('Bad', [
      ID,
      { name: 'orgId', type: 'uuid', references: { entity: 'Organization', column: 'nope' } },
    ]);
    expect(() => validateSchemaPlan([ORG, bad])).toThrow(/missing field 'Organization.nope'/);
  });

  test('test_ValidateSchemaPlan_ExternalReferenceMalformed_Throws', () => {
    const bad = entity('Bad', [
      ID,
      { name: 'x', type: 'uuid', references: { external: 'users; DROP' } },
    ]);
    expect(() => validateSchemaPlan([bad])).toThrow(/invalid external table/);
  });

  test('test_ValidateSchemaPlan_NoPrimaryKey_Throws', () => {
    expect(() => validateSchemaPlan([entity('NoPk', [{ name: 'x', type: 'string' }])])).toThrow(
      /needs a primary key/
    );
  });

  test('test_ValidateSchemaPlan_DuplicateFieldName_Throws', () => {
    expect(() => validateSchemaPlan([entity('Dup', [ID, ID])])).toThrow(/duplicate field 'id'/);
  });

  test('test_ValidateSchemaPlan_UnknownFieldType_ListsSupportedTypes', () => {
    expect(() => validateSchemaPlan([entity('T', [ID, { name: 'x', type: 'blob' }])])).toThrow(
      /unknown field type 'blob'. Supported: .*uuid/
    );
  });

  test('test_ValidateSchemaPlan_TenantAccessWithoutOrganizations_SuggestsFeature', () => {
    const doc = entity('Doc', [ID, { name: 'orgId', type: 'uuid' }], {
      scope: 'tenant',
      field: 'orgId',
    });
    expect(() => validateSchemaPlan([doc])).toThrow(/add the 'organizations' feature/);
  });

  test('test_ValidateSchemaPlan_TenantFieldNotReferencingOrganization_Throws', () => {
    const doc = entity('Doc', [ID, { name: 'orgId', type: 'uuid' }], {
      scope: 'tenant',
      field: 'orgId',
    });
    expect(() => validateSchemaPlan([...TENANT_BASE, doc])).toThrow(
      /must reference 'Organization'/
    );
  });

  test('test_ValidateSchemaPlan_AccessFieldMissing_Throws', () => {
    const doc = entity('Doc', [ID], { scope: 'owner', field: 'userId' });
    expect(() => validateSchemaPlan([...TENANT_BASE, doc])).toThrow(/is not a field of the entity/);
  });

  test('test_ValidateSchemaPlan_ViaParentWithoutDirectTenantScope_Throws', () => {
    const parent = entity('Parent', [ID], { scope: 'authenticated-read' });
    const child = entity(
      'Child',
      [ID, { name: 'parentId', type: 'uuid', references: { entity: 'Parent' } }],
      { scope: 'tenant', field: 'parentId', via: 'Parent' }
    );
    expect(() => validateSchemaPlan([...TENANT_BASE, parent, child])).toThrow(
      /must have a direct tenant scope/
    );
  });

  test('test_ValidateSchemaPlan_OwnerFieldNotReferencingProfile_Throws', () => {
    const note = entity('Note', [ID, { name: 'userId', type: 'uuid' }], {
      scope: 'owner',
      field: 'userId',
    });
    expect(() => validateSchemaPlan([PROFILE, note])).toThrow(/must reference 'Profile'/);
  });
});

describe('create table', () => {
  const byName = (list: DatabaseArtifact[]) => new Map(list.map((e) => [e.entityName, e]));

  test('test_BuildCreateTable_CompositePrimaryKey_EmitsTableLevelConstraintAndNoColumnPk', () => {
    const join = entity('RolePerm', [
      { name: 'roleId', type: 'uuid', required: true, primaryKey: true },
      { name: 'permId', type: 'uuid', required: true, primaryKey: true },
    ]);
    const sql = buildCreateTable(join, byName([join]));
    expect(sql).toContain('PRIMARY KEY ("role_id", "perm_id")');
    expect(sql).not.toContain('UUID PRIMARY KEY');
  });

  test('test_BuildCreateTable_StringDefaultWithQuote_IsEscaped', () => {
    const e = entity('T', [ID, { name: 'label', type: 'string', default: "it's" }]);
    expect(buildCreateTable(e, byName([e]))).toContain(`DEFAULT 'it''s'`);
  });

  test('test_BuildCreateTable_NumberAndBooleanDefaults_AreUnquoted', () => {
    const e = entity('T', [
      ID,
      { name: 'n', type: 'integer', default: 5 },
      { name: 'b', type: 'boolean', default: false },
    ]);
    const sql = buildCreateTable(e, byName([e]));
    expect(sql).toContain('"n" INTEGER DEFAULT 5');
    expect(sql).toContain('"b" BOOLEAN DEFAULT false');
  });

  test('test_BuildCreateTable_GenerateAuthUser_UsesAuthUidDefault', () => {
    const e = entity('T', [ID, { name: 'userId', type: 'uuid', generate: 'auth-user' }]);
    expect(buildCreateTable(e, byName([e]))).toContain('DEFAULT auth.uid()');
  });

  test('test_BuildCreateTable_ExternalReference_QualifiesSchemaAndAction', () => {
    const e = entity('P', [{ ...ID, references: { external: 'auth.users', onDelete: 'cascade' } }]);
    expect(buildCreateTable(e, byName([e]))).toContain(
      'REFERENCES auth."users"("id") ON DELETE CASCADE'
    );
  });

  test('test_BuildCreateTable_SetNullAction_RendersWithSpace', () => {
    const e = entity('T', [
      ID,
      { name: 'ownerId', type: 'uuid', references: { entity: 'T', onDelete: 'set null' } },
    ]);
    expect(buildCreateTable(e, byName([e]))).toContain('ON DELETE SET NULL');
  });

  test('test_IndexedColumns_ReferencesAndAccessField_AreIndexedButNotUniqueOrPrimary', () => {
    const e = entity(
      'T',
      [
        ID,
        { name: 'orgId', type: 'uuid', references: { entity: 'Organization' } },
        { name: 'slug', type: 'string', unique: true, indexed: true },
        { name: 'status', type: 'string', indexed: true },
      ],
      { scope: 'tenant', field: 'orgId' }
    );
    expect(indexedColumns(e)).toEqual(['orgId', 'status']);
  });
});

describe('row level security', () => {
  test('test_BuildPolicies_ServerOnlyTenantTable_HasSelectPolicyOnly', () => {
    const sql = buildPolicies([ORG, PROFILE, MEMBERSHIP]);
    expect(sql).toContain('CREATE POLICY "membership_select"');
    expect(sql).not.toContain('"membership_insert"');
    expect(sql).not.toContain('"membership_update"');
  });

  test('test_BuildPolicies_InsertOnly_HasInsertAndNoUpdateOrDelete', () => {
    const log = entity(
      'AuditLog',
      [ID, { name: 'actorId', type: 'uuid', references: { entity: 'Profile' } }],
      { scope: 'owner', field: 'actorId', writes: 'insert-only' }
    );
    const sql = buildPolicies([log]);
    expect(sql).toContain('"audit_log_insert"');
    expect(sql).not.toContain('"audit_log_update"');
    expect(sql).not.toContain('"audit_log_delete"');
  });

  test('test_BuildPolicies_EntityWithoutAccess_EnablesRlsWithoutAnyPolicy', () => {
    const sql = buildPolicies([entity('Secret', [ID])]);
    expect(sql).toContain('ALTER TABLE "secret" ENABLE ROW LEVEL SECURITY;');
    expect(sql).not.toContain('CREATE POLICY');
    expect(sql).toContain('no access rule, private');
  });

  test('test_BuildPolicies_PrivateScope_HasNoPolicy', () => {
    const sql = buildPolicies([entity('Internal', [ID], { scope: 'private' })]);
    expect(sql).not.toContain('CREATE POLICY');
  });

  test('test_BuildPolicies_Called_DropsPoliciesBeforeCreatingForIdempotency', () => {
    const sql = buildPolicies([PROFILE]);
    expect(sql.indexOf('DROP POLICY IF EXISTS "profile_select"')).toBeLessThan(
      sql.indexOf('CREATE POLICY "profile_select"')
    );
  });
});

describe('SupabaseDatabaseSubGenerator', () => {
  const generator = new SupabaseDatabaseSubGenerator();

  test('test_Generate_MigrationWithoutContent_ThrowsInsteadOfWritingPlaceholder', () => {
    const plan = planOf(
      [],
      [{ id: 'f:x', featureId: 'f', name: '0001_x.sql', type: 'database', description: 'd' }]
    );
    expect(() => generator.generate(plan)).toThrow(SchemaGenerationError);
    expect(() => generator.generate(plan)).toThrow(/has no SQL content/);
  });

  test('test_Generate_FeatureMigrationsRunBeforeEntityTables', () => {
    const plan = planOf(
      [PROFILE],
      [
        {
          id: 'f:ext',
          featureId: 'f',
          name: '0001_ext.sql',
          type: 'database',
          description: 'd',
          content: 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
        },
      ]
    );
    expect(Object.keys(generator.generate(plan)).slice(0, 2)).toEqual([
      'supabase/migrations/20260101000000_ext.sql',
      'supabase/migrations/20260101000001_create_profile.sql',
    ]);
  });

  test('test_Generate_NoEntities_ProducesNoTypesFileAndNoPolicyMigration', () => {
    expect(generator.generate(planOf([]))).toEqual({});
  });

  test('test_Generate_TenantEntities_EmitsHelperBeforePolicies', () => {
    const files = Object.keys(generator.generate(planOf(TENANT_BASE)));
    const helper = files.findIndex((f) => f.endsWith('_rls_helpers.sql'));
    const policies = files.findIndex((f) => f.endsWith('_rls_policies.sql'));
    expect(helper).toBeGreaterThan(-1);
    expect(helper).toBeLessThan(policies);
  });

  test('test_Generate_NoTenantEntities_OmitsRlsHelper', () => {
    const files = Object.keys(generator.generate(planOf([PROFILE])));
    expect(files.some((f) => f.endsWith('_rls_helpers.sql'))).toBe(false);
  });

  test('test_Generate_ProfileLinkedToAuthUsers_EmitsSyncTrigger', () => {
    const profile = entity('Profile', [
      { ...ID, references: { external: 'auth.users', onDelete: 'cascade' } },
      { name: 'email', type: 'string', required: true },
    ]);
    const files = generator.generate(planOf([profile]));
    const sync = files[Object.keys(files).find((f) => f.endsWith('_profile_sync.sql')) as string];
    expect(sync).toContain('AFTER INSERT ON auth.users');
    expect(sync).toContain('("id", "email") VALUES (new.id, new.email)');
  });

  test('test_Generate_SamePlanTwice_ProducesIdenticalOutput', () => {
    const plan = planOf(TENANT_BASE);
    expect(generator.generate(plan)).toEqual(generator.generate(plan));
  });
});

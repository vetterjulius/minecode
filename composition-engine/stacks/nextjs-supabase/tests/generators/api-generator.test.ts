import { describe, expect, test } from 'vitest';
import { ApiArtifact, CompositionPlan, DatabaseArtifact } from '@minecode/core';
import { NextjsSupabaseApiSubGenerator } from '../../src/generators/api.js';
import { UnsupportedContractError } from '../../src/generators/errors.js';

const thing: DatabaseArtifact = {
  id: 'f:Thing',
  featureId: 'f',
  entityName: 'Thing',
  fields: [
    { name: 'id', type: 'uuid', required: true, generate: 'uuid' },
    { name: 'title', type: 'string', required: true },
    { name: 'status', type: 'string', required: true, default: 'open' },
    { name: 'count', type: 'integer', required: false },
    { name: 'ownerId', type: 'uuid', required: true, generate: 'auth-user' },
    { name: 'createdAt', type: 'timestamp', required: true, generate: 'now' },
  ],
};

const child: DatabaseArtifact = {
  id: 'f:Part',
  featureId: 'f',
  entityName: 'Part',
  fields: [
    { name: 'id', type: 'uuid', required: true, generate: 'uuid' },
    { name: 'thingId', type: 'uuid', required: true, references: { entity: 'Thing' } },
  ],
};

function api(partial: Partial<ApiArtifact> & Pick<ApiArtifact, 'name'>): ApiArtifact {
  return { id: `f:${partial.name}`, featureId: 'f', path: '/api/things', ...partial };
}

function generate(entries: ApiArtifact[]): Record<string, string> {
  const plan = {
    applicationName: 'T',
    stackId: 'nextjs-supabase',
    database: [thing, child],
    api: entries,
    ui: [],
    navigation: [],
    events: [],
    permissions: [],
    migrations: [],
    extensionPoints: [],
  } as CompositionPlan;
  return new NextjsSupabaseApiSubGenerator().generate(plan);
}

const list = api({
  name: 'ListThings',
  method: 'GET',
  crud: { entity: 'Thing', operation: 'list' },
});
const create = api({
  name: 'CreateThing',
  method: 'POST',
  crud: { entity: 'Thing', operation: 'create' },
});

describe('generic crud routes', () => {
  test('test_Generate_ListAndCreateOnSamePath_ProduceOneRouteFileWithBothHandlers', () => {
    const files = generate([list, create]);
    const route = files['app/api/things/route.ts'];
    expect(Object.keys(files).sort()).toEqual([
      'app/api/things/route.ts',
      'lib/supabase/server.ts',
    ]);
    expect(route).toContain('export async function GET(');
    expect(route).toContain('export async function POST(');
    expect(route.match(/^import /gm)).toHaveLength(3);
    expect(route).toContain('createSupabaseServerClient');
    expect(route).not.toContain('auth-helpers');
  });

  test('test_Generate_List_OrdersByCreatedAtAndFiltersByEveryColumn', () => {
    const route = generate([list])['app/api/things/route.ts'];
    expect(route).toContain(".from('thing')");
    expect(route).toContain(".order('created_at', { ascending: false })");
    expect(route).toContain("'title'");
    expect(route).toContain("'owner_id'");
  });

  test('test_Generate_ListWithoutCreatedAt_OrdersByPrimaryKey', () => {
    const route = generate([
      api({ name: 'ListParts', path: '/api/parts', crud: { entity: 'Part', operation: 'list' } }),
    ])['app/api/parts/route.ts'];
    expect(route).toContain(".order('id', { ascending: true })");
  });

  test('test_Generate_ListWithInclude_EmbedsChildTable', () => {
    const route = generate([
      api({
        name: 'ListThings',
        method: 'GET',
        crud: { entity: 'Thing', operation: 'list', include: ['Part'] },
      }),
    ])['app/api/things/route.ts'];
    expect(route).toContain(".select('*, part(*)')");
  });

  test('test_Generate_Create_AcceptsOnlyUngeneratedColumns', () => {
    const route = generate([create])['app/api/things/route.ts'];
    expect(route).toContain("title: 'string'");
    expect(route).toContain("count: 'number'");
    expect(route).toContain("status: 'string'");
    expect(route).not.toContain("id: 'string'");
    expect(route).not.toContain("owner_id: 'string'");
    expect(route).not.toContain("created_at: 'string'");
  });

  test('test_Generate_Create_RequiresOnlyColumnsWithoutDefault', () => {
    const route = generate([create])['app/api/things/route.ts'];
    expect(route).toContain("['title']");
  });

  test('test_Generate_Create_MapsRowLevelSecurityViolationToForbidden', () => {
    const route = generate([create])['app/api/things/route.ts'];
    expect(route).toContain("code === '42501' ? 403 : 400");
  });

  test('test_Generate_Create_CallsExtensionHooksAroundInsert', () => {
    const route = generate([create])['app/api/things/route.ts'];
    expect(route).toContain("import { extensions } from '../../../extensions';");
    expect(route).toContain("extensions.hooks?.['Thing.beforeCreate']");
    expect(route).toContain("extensions.hooks?.['Thing.afterCreate']");
    expect(route.indexOf('beforeCreate')).toBeLessThan(route.indexOf('.insert(row)'));
    expect(route.indexOf('.insert(row)')).toBeLessThan(route.indexOf('afterCreate'));
  });

  test('test_Generate_ListOnly_DoesNotImportExtensions', () => {
    expect(generate([list])['app/api/things/route.ts']).not.toContain('extensions');
  });

  test('test_Generate_CrudOperationWithWrongMethod_Throws', () => {
    expect(() =>
      generate([api({ name: 'Bad', method: 'POST', crud: { entity: 'Thing', operation: 'list' } })])
    ).toThrow(/needs method GET/);
  });

  test('test_Generate_RowOperationsOnIdPath_ProduceDynamicRouteWithAllHandlers', () => {
    const at = '/api/things/:id';
    const files = generate([
      api({ name: 'Get', path: at, method: 'GET', crud: { entity: 'Thing', operation: 'get' } }),
      api({
        name: 'Upd',
        path: at,
        method: 'PATCH',
        crud: { entity: 'Thing', operation: 'update' },
      }),
      api({
        name: 'Del',
        path: at,
        method: 'DELETE',
        crud: { entity: 'Thing', operation: 'delete' },
      }),
    ]);
    const route = files['app/api/things/[id]/route.ts'];
    expect(route).toContain('export async function GET(');
    expect(route).toContain('export async function PATCH(');
    expect(route).toContain('export async function DELETE(');
    expect(route).toContain('Promise<{ id: string }>');
    expect(route).toContain("extensions.hooks?.['Thing.beforeUpdate']");
    expect(route).toContain("extensions.hooks?.['Thing.afterDelete']");
    expect(route).toContain('{ status: 404 }');
    // update never accepts the primary key or generated columns
    expect(route).not.toMatch(/PATCH[\s\S]*\bid: '/);
  });

  test('test_Generate_RowOperationWithoutIdParam_Throws', () => {
    expect(() =>
      generate([
        api({ name: 'Del', method: 'DELETE', crud: { entity: 'Thing', operation: 'delete' } }),
      ])
    ).toThrow(/needs a path ending in ':<param>'/);
  });

  test('test_Generate_RowOperationOnEntityWithSinglePrimaryKey_Works', () => {
    expect(() =>
      generate([
        api({
          name: 'Get',
          path: '/api/parts/:id',
          method: 'GET',
          crud: { entity: 'Part', operation: 'get' },
        }),
      ])
    ).not.toThrow();
  });
});

describe('behavior routes', () => {
  test('test_Generate_KnownBehavior_EmitsItsHandler', () => {
    const files = generate([
      api({ name: 'Login', path: '/api/auth/login', method: 'POST', behavior: 'auth.login' }),
    ]);
    expect(files['app/api/auth/login/route.ts']).toContain('signInWithPassword');
  });

  test('test_Generate_UnknownBehavior_Throws', () => {
    expect(() => generate([api({ name: 'X', method: 'GET', behavior: 'nope.nothing' })])).toThrow(
      UnsupportedContractError
    );
  });

  test('test_Generate_NeitherCrudNorBehavior_Throws', () => {
    expect(() => generate([api({ name: 'X', method: 'GET' })])).toThrow(
      /neither 'crud' nor 'behavior'/
    );
  });

  test('test_Generate_TwoFeaturesClaimSameMethodAndPath_Throws', () => {
    expect(() => generate([list, { ...list, id: 'g:ListThings', featureId: 'g' }])).toThrow(
      /duplicates GET/
    );
  });

  test('test_Generate_WebhookBehavior_AlsoEmitsItsLibraries', () => {
    const files = generate([
      api({
        name: 'Webhook',
        path: '/api/billing/webhook',
        method: 'POST',
        behavior: 'billing.webhook',
      }),
    ]);
    expect(Object.keys(files)).toContain('lib/billing/verify-stripe-signature.ts');
  });

  test('test_Generate_CrudAndBehaviorOnSamePath_AreMergedIntoOneFile', () => {
    const files = generate([
      api({
        name: 'ListChat',
        path: '/api/ai/chat',
        method: 'GET',
        crud: { entity: 'Thing', operation: 'list' },
      }),
      api({ name: 'Post', path: '/api/ai/chat', method: 'POST', behavior: 'ai.chat.post' }),
    ]);
    const route = files['app/api/ai/chat/route.ts'];
    expect(route).toContain('export async function GET(');
    expect(route).toContain('export async function POST(');
    expect(route.match(/^import \{ NextResponse \}/gm)).toHaveLength(1);
  });
});

describe('permission guard', () => {
  const guardPlan = (rbac: boolean) =>
    ({
      applicationName: 'x',
      stackId: 'nextjs-supabase',
      database: [
        {
          id: 'f:Thing',
          featureId: 'f',
          entityName: 'Thing',
          fields: [
            { name: 'id', type: 'uuid', primaryKey: true, generate: 'uuid' },
            { name: 'name', type: 'string', required: true },
          ],
        },
        ...(rbac
          ? ['Role', 'Permission', 'RolePermission', 'Membership'].map((n) => ({
              id: `r:${n}`,
              featureId: 'r',
              entityName: n,
              fields: [{ name: 'id', type: 'uuid', primaryKey: true, generate: 'uuid' }],
            }))
          : []),
      ],
      api: [
        {
          id: 'f:create',
          featureId: 'f',
          name: 'create',
          path: '/api/things',
          method: 'POST',
          crud: { entity: 'Thing', operation: 'create' },
          permission: 'things.write',
        },
      ],
      ui: [],
      navigation: [],
      events: [],
      permissions: [],
      migrations: [],
      extensionPoints: [],
    }) as unknown as CompositionPlan;

  test('wraps the handler so the permission is checked before it runs', () => {
    const files = new NextjsSupabaseApiSubGenerator().generate(guardPlan(true));
    const route = files['app/api/things/route.ts'];
    expect(route).toContain('async function handlePOST(');
    expect(route).toMatch(/requirePermission\(\s*args\[0\],[\s\S]*'things\.write'/);
    expect(route.indexOf('requirePermission(')).toBeLessThan(route.indexOf('return handlePOST'));
    expect(files['lib/permissions.ts']).toContain('my_permissions');
  });

  test('does not guard when no roles exist to check against', () => {
    const files = new NextjsSupabaseApiSubGenerator().generate(guardPlan(false));
    expect(files['app/api/things/route.ts']).not.toContain('requirePermission');
  });
});

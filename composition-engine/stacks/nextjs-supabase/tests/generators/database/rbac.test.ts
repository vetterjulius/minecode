import { describe, expect, test } from 'vitest';
import { CompositionPlan, DatabaseArtifact } from '@minecode/core';
import {
  buildPermissionFunction,
  buildRbacSeed,
  rbacActive,
} from '../../../src/generators/database/rbac.js';
import { SchemaGenerationError } from '../../../src/generators/database/errors.js';

function plan(featureConfig?: CompositionPlan['featureConfig']): CompositionPlan {
  const permission = (name: string) => ({ id: `f:${name}`, featureId: 'f', name });
  return {
    applicationName: 'T',
    stackId: 'nextjs-supabase',
    database: [],
    api: [],
    ui: [],
    navigation: [],
    events: [],
    permissions: ['project.read', 'project.write', 'billing.write', 'rbac.write'].map(permission),
    migrations: [],
    extensionPoints: [],
    featureConfig,
  };
}

const entity = (entityName: string): DatabaseArtifact => ({
  id: entityName,
  featureId: 'f',
  entityName,
  fields: [],
});

describe('rbac seed', () => {
  test('test_RbacActive_AllRoleEntitiesPresent_ReturnsTrue', () => {
    const names = ['Role', 'Permission', 'RolePermission', 'Membership'];
    expect(rbacActive(names.map(entity))).toBe(true);
    expect(rbacActive(names.slice(1).map(entity))).toBe(false);
  });

  test('test_BuildRbacSeed_NoConfig_SeedsOwnerAdminMemberWithDefaultGrants', () => {
    const sql = buildRbacSeed(plan());
    expect(sql).toContain(`('owner', 'billing.write')`);
    expect(sql).toContain(`('admin', 'project.write')`);
    expect(sql).not.toContain(`('admin', 'billing.write')`);
    expect(sql).toContain(`('member', 'project.write')`);
    expect(sql).not.toContain(`('member', 'rbac.write')`);
  });

  test('test_BuildRbacSeed_RoleWithoutEntry_GetsReadOnlyAccess', () => {
    const sql = buildRbacSeed(plan({ rbac: { defaultRoles: ['viewer'] } }));
    expect(sql).toContain(`('viewer', 'project.read')`);
    expect(sql).not.toContain(`('viewer', 'project.write')`);
  });

  test('test_BuildRbacSeed_ExplicitRoleMapping_OverridesDefaults', () => {
    const sql = buildRbacSeed(
      plan({ rbac: { defaultRoles: ['owner'], roles: { owner: ['project.*', '!project.write'] } } })
    );
    expect(sql).toContain(`('owner', 'project.read')`);
    expect(sql).not.toContain(`('owner', 'project.write')`);
    expect(sql).not.toContain(`('owner', 'billing.write')`);
  });

  test('test_BuildRbacSeed_UnknownPermissionName_Throws', () => {
    expect(() => buildRbacSeed(plan({ rbac: { roles: { ops: ['project.writ'] } } }))).toThrow(
      SchemaGenerationError
    );
  });

  test('test_BuildRbacSeed_Output_IsIdempotent', () => {
    const sql = buildRbacSeed(plan());
    expect(sql.match(/ON CONFLICT/g)).toHaveLength(3);
  });

  test('test_BuildPermissionFunction_Output_IsSecurityDefinerWithFixedSearchPath', () => {
    const sql = buildPermissionFunction();
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('SET search_path = public');
  });
});

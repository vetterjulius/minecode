import {
  CompositionPlan,
  DatabaseArtifact,
  SchemaChange,
  SchemaChangeBlockedError,
  SubGenerator,
  createSnapshot,
  diffSnapshots,
} from '@minecode/core';
import { buildAddColumns, buildCreateTable } from './ddl.js';
import { SchemaGenerationError } from './errors.js';
import { MigrationSequence } from './migration-files.js';
import { slugify, tableName } from './naming.js';
import { orderByReferences } from './ordering.js';
import { buildProfileSync, findAuthProfile } from './profile-sync.js';
import {
  buildInvitationFunction,
  buildOrgFunctions,
  invitationFunctionActive,
  orgFunctionsActive,
} from './org-functions.js';
import {
  buildMyPermissionsFunction,
  buildPermissionFunction,
  buildRbacSeed,
  rbacActive,
} from './rbac.js';
import { buildPolicies, buildRlsHelpers, usesTenantAccess } from './rls.js';
import { buildRowTypes } from './row-types.js';
import { validateSchemaPlan } from './validate.js';

const POLICY_TRIGGERS: SchemaChange['kind'][] = [
  'add-entity',
  'access-changed',
  'permissions-changed',
];
const SEED_TRIGGERS: SchemaChange['kind'][] = [
  'add-entity',
  'permissions-changed',
  'config-changed',
];

export class SupabaseDatabaseSubGenerator implements SubGenerator {
  public readonly id = 'supabase-database';

  public generate(plan: CompositionPlan): Record<string, string> {
    validateSchemaPlan(plan.database);
    const entities = orderByReferences(plan.database);
    const byName = new Map(entities.map((e) => [e.entityName, e]));
    const baseline = plan.schemaBaseline;
    const migrations = new MigrationSequence(baseline?.migrationCount ?? 0);

    for (const migration of plan.migrations) {
      if (!migration.content) {
        throw new SchemaGenerationError(
          `Migration '${migration.name}' (feature '${migration.featureId}') has no SQL content`
        );
      }
      if (baseline?.schema.rawMigrations.includes(migration.name)) continue;
      migrations.add(slugify(migration.name), migration.content);
    }

    const changes = baseline ? this.planChanges(plan) : null;
    const isNew = (e: DatabaseArtifact) =>
      !changes || changes.some((c) => c.kind === 'add-entity' && c.entity === e.entityName);
    const triggered = (kinds: SchemaChange['kind'][]) =>
      !changes || changes.some((c) => kinds.includes(c.kind));

    for (const entity of entities.filter(isNew)) {
      migrations.add(`create_${tableName(entity.entityName)}`, buildCreateTable(entity, byName));
    }
    for (const entity of entities) {
      const added = (changes ?? [])
        .filter((c) => c.kind === 'add-field' && c.entity === entity.entityName)
        .map((c) => (c as { field: string }).field);
      if (added.length > 0) {
        migrations.add(
          `add_columns_${tableName(entity.entityName)}`,
          buildAddColumns(entity, added, byName)
        );
      }
    }

    const rbac = rbacActive(entities);
    const policies = entities.length > 0 && triggered(POLICY_TRIGGERS);
    if (usesTenantAccess(entities) && policies) {
      migrations.add('rls_helpers', buildRlsHelpers());
    }
    if (rbac && triggered(SEED_TRIGGERS)) {
      migrations.add(
        'rbac_helpers',
        buildPermissionFunction() + '\n' + buildMyPermissionsFunction()
      );
      migrations.add('rbac_seed', buildRbacSeed(plan));
    }
    if (orgFunctionsActive(entities) && triggered(['add-entity'])) {
      migrations.add('organization_functions', buildOrgFunctions(entities));
    }
    if (invitationFunctionActive(entities) && triggered(['add-entity'])) {
      migrations.add('invitation_function', buildInvitationFunction(entities));
    }
    if (policies) {
      migrations.add('rls_policies', buildPolicies(entities, rbac));
    }
    const profile = findAuthProfile(entities);
    if (profile && isNew(profile)) {
      migrations.add('profile_sync', buildProfileSync(profile));
    }

    const files = migrations.toFiles();
    if (entities.length > 0) {
      files['types/database.ts'] = buildRowTypes(plan.applicationName, entities);
    }
    return files;
  }

  private planChanges(plan: CompositionPlan): SchemaChange[] {
    const baseline = plan.schemaBaseline as NonNullable<CompositionPlan['schemaBaseline']>;
    const next = createSnapshot(
      plan.database,
      plan.permissions,
      plan.migrations.map((m) => m.name),
      plan.featureConfig
    );
    const diff = diffSnapshots(baseline.schema, next);
    if (diff.blocked.length > 0) throw new SchemaChangeBlockedError(diff.blocked);
    return diff.changes;
  }
}

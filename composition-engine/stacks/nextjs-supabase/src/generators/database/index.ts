import { CompositionPlan, SubGenerator } from '@minecode/core';
import { buildCreateTable } from './ddl.js';
import { SchemaGenerationError } from './errors.js';
import { MigrationSequence } from './migration-files.js';
import { slugify, tableName } from './naming.js';
import { orderByReferences } from './ordering.js';
import { buildProfileSync, findAuthProfile } from './profile-sync.js';
import { buildPolicies, buildRlsHelpers, usesTenantAccess } from './rls.js';
import { buildRowTypes } from './row-types.js';
import { validateSchemaPlan } from './validate.js';

export class SupabaseDatabaseSubGenerator implements SubGenerator {
  public readonly id = 'supabase-database';

  public generate(plan: CompositionPlan): Record<string, string> {
    validateSchemaPlan(plan.database);
    const entities = orderByReferences(plan.database);
    const byName = new Map(entities.map((e) => [e.entityName, e]));
    const migrations = new MigrationSequence();

    for (const migration of plan.migrations) {
      if (!migration.content) {
        throw new SchemaGenerationError(
          `Migration '${migration.name}' (feature '${migration.featureId}') has no SQL content`
        );
      }
      migrations.add(slugify(migration.name), migration.content);
    }
    for (const entity of entities) {
      migrations.add(`create_${tableName(entity.entityName)}`, buildCreateTable(entity, byName));
    }
    if (usesTenantAccess(entities)) {
      migrations.add('rls_helpers', buildRlsHelpers());
    }
    if (entities.length > 0) {
      migrations.add('rls_policies', buildPolicies(entities));
    }
    const profile = findAuthProfile(entities);
    if (profile) {
      migrations.add('profile_sync', buildProfileSync(profile));
    }

    const files = migrations.toFiles();
    if (entities.length > 0) {
      files['types/database.ts'] = buildRowTypes(plan.applicationName, entities);
    }
    return files;
  }
}

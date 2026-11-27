import { DatabaseArtifact, SchemaSnapshot, SnapshotEntity } from './domain/types.js';

export type SchemaChange =
  | { kind: 'add-entity'; entity: string }
  | { kind: 'add-field'; entity: string; field: string }
  | { kind: 'access-changed'; entity: string }
  | { kind: 'permissions-changed' }
  | { kind: 'config-changed' };

export interface BlockedChange {
  kind: 'remove-entity' | 'remove-field' | 'change-field' | 'unsafe-add-field';
  entity: string;
  field?: string;
  reason: string;
}

export interface SchemaDiff {
  changes: SchemaChange[];
  blocked: BlockedChange[];
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortDeep(v)])
    );
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

export function createSnapshot(
  database: DatabaseArtifact[],
  permissions: { name: string }[],
  rawMigrations: string[],
  featureConfig: Record<string, Record<string, unknown>> = {}
): SchemaSnapshot {
  const entities: Record<string, SnapshotEntity> = {};
  for (const entity of database) {
    const fields: SnapshotEntity['fields'] = {};
    for (const field of entity.fields) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { name, description, ...rest } = field;
      fields[name] = rest;
    }
    entities[entity.entityName] = { fields, ...(entity.access ? { access: entity.access } : {}) };
  }
  return {
    entities,
    permissions: permissions.map((p) => p.name).sort(),
    rawMigrations: [...rawMigrations].sort(),
    featureConfig,
  };
}

/**
 * Compares the locked schema with the newly composed one. Only additive changes are
 * allowed through; anything that could lose data or break existing rows is reported as blocked.
 */
export function diffSnapshots(previous: SchemaSnapshot, next: SchemaSnapshot): SchemaDiff {
  const changes: SchemaChange[] = [];
  const blocked: BlockedChange[] = [];

  for (const [name, before] of Object.entries(previous.entities)) {
    const after = next.entities[name];
    if (!after) {
      blocked.push({
        kind: 'remove-entity',
        entity: name,
        reason: `Entity '${name}' was removed; dropping tables is never generated`,
      });
      continue;
    }
    for (const [field, spec] of Object.entries(before.fields)) {
      const newSpec = after.fields[field];
      if (!newSpec) {
        blocked.push({
          kind: 'remove-field',
          entity: name,
          field,
          reason: `Field '${name}.${field}' was removed; dropping columns is never generated`,
        });
      } else if (stableJson(spec) !== stableJson(newSpec)) {
        blocked.push({
          kind: 'change-field',
          entity: name,
          field,
          reason: `Field '${name}.${field}' changed; altering existing columns is not generated`,
        });
      }
    }
    for (const [field, spec] of Object.entries(after.fields)) {
      if (before.fields[field]) continue;
      const fillsExistingRows =
        spec.required === false || spec.default !== undefined || spec.generate;
      if (spec.primaryKey || (spec.required && !fillsExistingRows)) {
        blocked.push({
          kind: 'unsafe-add-field',
          entity: name,
          field,
          reason: spec.primaryKey
            ? `New primary key field '${name}.${field}' cannot be added to an existing table`
            : `New required field '${name}.${field}' needs a default or must be optional, because existing rows have no value`,
        });
      } else {
        changes.push({ kind: 'add-field', entity: name, field });
      }
    }
    if (stableJson(before.access) !== stableJson(after.access)) {
      changes.push({ kind: 'access-changed', entity: name });
    }
  }
  for (const name of Object.keys(next.entities)) {
    if (!previous.entities[name]) changes.push({ kind: 'add-entity', entity: name });
  }
  if (stableJson(previous.permissions) !== stableJson(next.permissions)) {
    changes.push({ kind: 'permissions-changed' });
  }
  if (stableJson(previous.featureConfig) !== stableJson(next.featureConfig)) {
    changes.push({ kind: 'config-changed' });
  }
  return { changes, blocked };
}

export class SchemaChangeBlockedError extends Error {
  constructor(public readonly blocked: BlockedChange[]) {
    super(
      `The blueprint changes the locked schema in ways that are not generated:\n` +
        blocked.map((b) => `  - ${b.reason}`).join('\n') +
        `\nWrite the migration by hand under supabase/migrations and update app.lock.json, or revert the change.`
    );
    this.name = 'SchemaChangeBlockedError';
  }
}

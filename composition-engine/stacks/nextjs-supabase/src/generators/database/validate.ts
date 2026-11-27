import { DatabaseArtifact, EntityAccess } from '@minecode/core';
import { SchemaGenerationError } from './errors.js';
import { resolveFieldType } from './field-types.js';
import { primaryKeyFields } from './primary-key.js';

const EXTERNAL_TABLE_PATTERN = /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/;
const TENANT_ROOT = 'Organization';
const TENANT_MEMBERSHIP = 'Membership';
const OWNER_ROOT = 'Profile';

function fail(entity: DatabaseArtifact, message: string): never {
  throw new SchemaGenerationError(
    `Entity '${entity.entityName}' (feature '${entity.featureId}'): ${message}`
  );
}

function validateDuplicates(entities: DatabaseArtifact[]): void {
  const seen = new Map<string, DatabaseArtifact>();
  for (const entity of entities) {
    const other = seen.get(entity.entityName);
    if (other) {
      fail(entity, `already provided by feature '${other.featureId}'`);
    }
    seen.set(entity.entityName, entity);
  }
}

function validateFields(entity: DatabaseArtifact, byName: Map<string, DatabaseArtifact>): void {
  const names = new Set<string>();
  for (const field of entity.fields) {
    if (names.has(field.name)) fail(entity, `duplicate field '${field.name}'`);
    names.add(field.name);
    resolveFieldType(field.type, `${entity.entityName}.${field.name}`);
    validateReference(entity, field.name, field.references, byName);
  }
  if (primaryKeyFields(entity.fields).length === 0) {
    fail(entity, "needs a primary key: add a field named 'id' or mark fields with primaryKey");
  }
}

function validateReference(
  entity: DatabaseArtifact,
  fieldName: string,
  reference: DatabaseArtifact['fields'][number]['references'],
  byName: Map<string, DatabaseArtifact>
): void {
  if (!reference) return;
  if (reference.external) {
    if (!EXTERNAL_TABLE_PATTERN.test(reference.external)) {
      fail(entity, `field '${fieldName}' has invalid external table '${reference.external}'`);
    }
    return;
  }
  const target = byName.get(reference.entity ?? '');
  if (!target) {
    fail(
      entity,
      `field '${fieldName}' references entity '${reference.entity}' which is not part of the composition; add the feature that provides it`
    );
  }
  const column = reference.column ?? 'id';
  if (!target.fields.some((f) => f.name === column)) {
    fail(entity, `field '${fieldName}' references missing field '${target.entityName}.${column}'`);
  }
}

function requireField(entity: DatabaseArtifact, access: EntityAccess): void {
  if (!entity.fields.some((f) => f.name === access.field)) {
    fail(entity, `access.field '${access.field}' is not a field of the entity`);
  }
}

function referencedEntityOf(entity: DatabaseArtifact, fieldName: string): string | undefined {
  return entity.fields.find((f) => f.name === fieldName)?.references?.entity;
}

function validateTenantAccess(
  entity: DatabaseArtifact,
  access: EntityAccess,
  byName: Map<string, DatabaseArtifact>
): void {
  if (!byName.has(TENANT_ROOT) || !byName.has(TENANT_MEMBERSHIP)) {
    fail(
      entity,
      `tenant access requires entities '${TENANT_ROOT}' and '${TENANT_MEMBERSHIP}'; add the 'organizations' feature`
    );
  }
  const field = access.field as string;
  if (access.via) {
    validateViaAccess(entity, access, field, byName);
    return;
  }
  const isRoot = entity.entityName === TENANT_ROOT && field === 'id';
  if (!isRoot && referencedEntityOf(entity, field) !== TENANT_ROOT) {
    fail(entity, `tenant field '${field}' must reference '${TENANT_ROOT}'`);
  }
}

function validateViaAccess(
  entity: DatabaseArtifact,
  access: EntityAccess,
  field: string,
  byName: Map<string, DatabaseArtifact>
): void {
  const parent = byName.get(access.via as string);
  if (!parent) fail(entity, `access.via '${access.via}' is not part of the composition`);
  if (referencedEntityOf(entity, field) !== parent.entityName) {
    fail(entity, `access.field '${field}' must reference '${parent.entityName}'`);
  }
  if (parent.access?.scope !== 'tenant' || parent.access.via) {
    fail(entity, `access.via parent '${parent.entityName}' must have a direct tenant scope`);
  }
}

function validateOwnerAccess(entity: DatabaseArtifact, access: EntityAccess): void {
  const field = access.field as string;
  const isProfileId = entity.entityName === OWNER_ROOT && field === 'id';
  if (!isProfileId && referencedEntityOf(entity, field) !== OWNER_ROOT) {
    fail(entity, `owner field '${field}' must reference '${OWNER_ROOT}'`);
  }
}

function validateAccess(entity: DatabaseArtifact, byName: Map<string, DatabaseArtifact>): void {
  const access = entity.access;
  if (!access) return;
  if (access.scope === 'tenant' || access.scope === 'owner') requireField(entity, access);
  if (access.scope === 'tenant') validateTenantAccess(entity, access, byName);
  if (access.scope === 'owner') validateOwnerAccess(entity, access);
}

export function validateSchemaPlan(entities: DatabaseArtifact[]): void {
  validateDuplicates(entities);
  const byName = new Map(entities.map((e) => [e.entityName, e]));
  for (const entity of entities) {
    validateFields(entity, byName);
  }
  for (const entity of entities) {
    validateAccess(entity, byName);
  }
}

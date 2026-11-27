import { DatabaseArtifact, EntityField } from '@minecode/core';
import { SchemaGenerationError } from './errors.js';
import { resolveFieldType } from './field-types.js';
import { columnName, quote, tableName } from './naming.js';
import { isPrimaryKey, primaryKeyFields } from './primary-key.js';

function defaultClause(field: EntityField): string | null {
  if (field.generate === 'uuid') return 'DEFAULT gen_random_uuid()';
  if (field.generate === 'now') return 'DEFAULT now()';
  if (field.generate === 'auth-user') return 'DEFAULT auth.uid()';
  if (field.default === undefined) return null;
  if (typeof field.default === 'string') return `DEFAULT '${field.default.replace(/'/g, "''")}'`;
  return `DEFAULT ${String(field.default)}`;
}

function referenceClause(
  field: EntityField,
  entities: Map<string, DatabaseArtifact>
): string | null {
  const ref = field.references;
  if (!ref) return null;
  const column = quote(columnName(ref.column ?? 'id'));
  const onDelete = ref.onDelete ? ` ON DELETE ${ref.onDelete.toUpperCase()}` : '';
  if (ref.external) {
    const [schema, table] = ref.external.split('.');
    return `REFERENCES ${schema}.${quote(table)}(${column})${onDelete}`;
  }
  const target = entities.get(ref.entity as string);
  if (!target) {
    throw new SchemaGenerationError(`Unknown referenced entity '${ref.entity}'`);
  }
  return `REFERENCES ${quote(tableName(target.entityName))}(${column})${onDelete}`;
}

export function columnDefinition(
  entity: DatabaseArtifact,
  field: EntityField,
  entities: Map<string, DatabaseArtifact>
): string {
  const type = resolveFieldType(field.type, `${entity.entityName}.${field.name}`).sql;
  const pk = primaryKeyFields(entity.fields);
  const singlePk = isPrimaryKey(field, entity.fields) && pk.length === 1;
  const parts = [quote(columnName(field.name)), type];
  if (singlePk) parts.push('PRIMARY KEY');
  if (field.required || isPrimaryKey(field, entity.fields)) parts.push('NOT NULL');
  if (field.unique) parts.push('UNIQUE');
  const def = defaultClause(field);
  if (def) parts.push(def);
  const ref = referenceClause(field, entities);
  if (ref) parts.push(ref);
  return `  ${parts.join(' ')}`;
}

export function indexedColumns(entity: DatabaseArtifact): string[] {
  const columns = new Set<string>();
  const pkNames = primaryKeyFields(entity.fields).map((f) => f.name);
  for (const field of entity.fields) {
    if (field.unique || pkNames.includes(field.name)) continue;
    if (field.references || field.indexed) columns.add(field.name);
  }
  const accessField = entity.access?.field;
  if (accessField && !pkNames.includes(accessField)) columns.add(accessField);
  return [...columns].sort();
}

export function indexStatements(entity: DatabaseArtifact): string[] {
  const table = tableName(entity.entityName);
  return indexedColumns(entity).map((name) => {
    const column = columnName(name);
    return `CREATE INDEX IF NOT EXISTS ${quote(`idx_${table}_${column}`)} ON ${quote(table)} (${quote(column)});`;
  });
}

/** Additive migration for new columns of an existing table. */
export function buildAddColumns(
  entity: DatabaseArtifact,
  fieldNames: string[],
  entities: Map<string, DatabaseArtifact>
): string {
  const table = quote(tableName(entity.entityName));
  const statements = fieldNames.map((name) => {
    const field = entity.fields.find((f) => f.name === name) as EntityField;
    return `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${columnDefinition(entity, field, entities).trim()};`;
  });
  return (
    [
      `-- Entity: ${entity.entityName} (new columns)`,
      ...statements,
      ...indexStatements(entity),
    ].join('\n') + '\n'
  );
}

export function buildCreateTable(
  entity: DatabaseArtifact,
  entities: Map<string, DatabaseArtifact>
): string {
  const lines = entity.fields.map((field) => columnDefinition(entity, field, entities));
  const pk = primaryKeyFields(entity.fields);
  if (pk.length > 1) {
    lines.push(`  PRIMARY KEY (${pk.map((f) => quote(columnName(f.name))).join(', ')})`);
  }
  const header = [`-- Entity: ${entity.entityName} (feature: ${entity.featureId})`];
  if (entity.description) header.push(`-- ${entity.description}`);
  const table = `CREATE TABLE IF NOT EXISTS ${quote(tableName(entity.entityName))} (\n${lines.join(',\n')}\n);`;
  return [...header, table, ...indexStatements(entity)].join('\n') + '\n';
}

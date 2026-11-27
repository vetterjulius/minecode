import { DatabaseArtifact } from '@minecode/core';
import { resolveFieldType } from './field-types.js';
import { columnName, tableName } from './naming.js';
import { isPrimaryKey } from './primary-key.js';

function rowField(entity: DatabaseArtifact, field: DatabaseArtifact['fields'][number]): string {
  const ts = resolveFieldType(field.type, `${entity.entityName}.${field.name}`).ts;
  const hasValue = field.required || isPrimaryKey(field, entity.fields) || Boolean(field.generate);
  const doc = field.description ? `  /** ${field.description} */\n` : '';
  return `${doc}  ${columnName(field.name)}${hasValue ? '' : '?'}: ${ts}${hasValue ? '' : ' | null'};`;
}

function rowInterface(entity: DatabaseArtifact): string {
  const header = entity.description
    ? `/** ${entity.description} (table "${tableName(entity.entityName)}") */\n`
    : '';
  const body = entity.fields.map((f) => rowField(entity, f)).join('\n');
  return `${header}export interface ${entity.entityName}Row {\n${body}\n}\n`;
}

export function buildRowTypes(applicationName: string, entities: DatabaseArtifact[]): string {
  const sorted = [...entities].sort((a, b) => a.entityName.localeCompare(b.entityName));
  return `// Row types of the database schema of ${applicationName}\n\n${sorted.map(rowInterface).join('\n')}`;
}

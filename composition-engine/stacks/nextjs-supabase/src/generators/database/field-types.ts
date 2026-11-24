import { SchemaGenerationError } from './errors.js';

export interface ResolvedFieldType {
  sql: string;
  ts: string;
}

const FIELD_TYPES: Record<string, ResolvedFieldType> = {
  uuid: { sql: 'UUID', ts: 'string' },
  string: { sql: 'VARCHAR(255)', ts: 'string' },
  text: { sql: 'TEXT', ts: 'string' },
  integer: { sql: 'INTEGER', ts: 'number' },
  int: { sql: 'INTEGER', ts: 'number' },
  number: { sql: 'INTEGER', ts: 'number' },
  float: { sql: 'DOUBLE PRECISION', ts: 'number' },
  double: { sql: 'DOUBLE PRECISION', ts: 'number' },
  boolean: { sql: 'BOOLEAN', ts: 'boolean' },
  timestamp: { sql: 'TIMESTAMPTZ', ts: 'string' },
  date: { sql: 'TIMESTAMPTZ', ts: 'string' },
  datetime: { sql: 'TIMESTAMPTZ', ts: 'string' },
  json: { sql: 'JSONB', ts: 'unknown' },
  jsonb: { sql: 'JSONB', ts: 'unknown' },
};

export function resolveFieldType(type: string, location: string): ResolvedFieldType {
  const resolved = FIELD_TYPES[type.toLowerCase()];
  if (!resolved) {
    throw new SchemaGenerationError(
      `${location}: unknown field type '${type}'. Supported: ${Object.keys(FIELD_TYPES).join(', ')}`
    );
  }
  return resolved;
}

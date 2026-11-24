import { EntityField } from '@minecode/core';

export function primaryKeyFields(fields: EntityField[]): EntityField[] {
  const flagged = fields.filter((f) => f.primaryKey);
  if (flagged.length > 0) return flagged;
  return fields.filter((f) => f.name === 'id');
}

export function isPrimaryKey(field: EntityField, fields: EntityField[]): boolean {
  return primaryKeyFields(fields).includes(field);
}

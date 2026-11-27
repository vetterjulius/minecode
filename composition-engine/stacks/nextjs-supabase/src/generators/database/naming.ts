export function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

export function tableName(entityName: string): string {
  return toSnakeCase(entityName);
}

export function columnName(fieldName: string): string {
  return toSnakeCase(fieldName);
}

export function quote(identifier: string): string {
  return `"${identifier}"`;
}

export function slugify(value: string): string {
  return value
    .replace(/\.[^.]+$/, '')
    .replace(/^.*\//, '')
    .replace(/^\d+_?/, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

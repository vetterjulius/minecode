import { getSchemaInfo } from '@minecode/schemas';

export function getRegistryInfo(): string {
  return `Minecode Registry relying on: ${getSchemaInfo()}`;
}

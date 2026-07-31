import { getCoreInfo } from '@minecode/core';

export function getSchemaInfo(): string {
  return `Minecode Schemas relying on: ${getCoreInfo()}`;
}

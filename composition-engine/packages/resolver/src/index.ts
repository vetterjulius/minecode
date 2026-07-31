import { getRegistryInfo } from '@minecode/registry';

export function getResolverInfo(): string {
  return `Minecode Resolver relying on: ${getRegistryInfo()}`;
}

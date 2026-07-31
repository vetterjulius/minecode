import { getResolverInfo } from '@minecode/resolver';

export function getComposerInfo(): string {
  return `Minecode Composer relying on: ${getResolverInfo()}`;
}

import { getComposerInfo } from '@minecode/composer';

export function getGeneratorInfo(): string {
  return `Minecode Generator relying on: ${getComposerInfo()}`;
}

export { ApplicationGenerator } from './application-generator.js';
export * from '@minecode/nextjs-supabase';

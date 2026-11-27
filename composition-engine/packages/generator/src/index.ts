import { getComposerInfo } from '@minecode/composer';

export function getGeneratorInfo(): string {
  return `Minecode Generator relying on: ${getComposerInfo()}`;
}

export {
  createDefaultStackRegistry,
  ApplicationGenerator,
  LOCK_FILE,
  readLock,
} from './application-generator.js';
export type { GenerationReport } from './application-generator.js';
export * from '@minecode/nextjs-supabase';
export * from '@minecode/openapi';

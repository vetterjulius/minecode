export const CORE_VERSION = '0.1.0';

export function getCoreInfo(): string {
  return `Minecode Core version ${CORE_VERSION}`;
}

export * from './boundary-validator.js';

import { test, expect } from 'vitest';
import { SubGeneratorRegistry, BUILTIN_SUB_GENERATORS } from '../src/index.js';
import { CompositionPlan } from '@minecode/core';

test('test_SubGeneratorRegistry_BuiltinGenerators_AreLoadedCorrectly', () => {
  const registry = new SubGeneratorRegistry();
  expect(registry.list().length).toBe(BUILTIN_SUB_GENERATORS.length);
  expect(registry.has('supabase-database')).toBe(true);
  expect(registry.has('nextjs-supabase-auth')).toBe(true);
  expect(registry.has('nextjs-supabase-billing')).toBe(true);
  expect(registry.has('nextjs-supabase-orgs')).toBe(true);
  expect(registry.has('nextjs-supabase-rbac')).toBe(true);
  expect(registry.has('supabase-generic-api')).toBe(true);
  expect(registry.has('nextjs-generic-ui')).toBe(true);
  expect(registry.has('nextjs-navigation')).toBe(true);
  expect(registry.has('common-events')).toBe(true);
  expect(registry.has('common-extensions')).toBe(true);
  expect(registry.has('nextjs-workspace')).toBe(true);
});

test('test_SubGeneratorRegistry_RegisterCustomGenerator_RegistersSuccessfully', () => {
  const registry = new SubGeneratorRegistry();
  const mockGen = {
    id: 'mock-gen',
    generate: (_plan: CompositionPlan) => ({ 'generated/mock.txt': 'hello' }),
  };

  registry.register(mockGen);
  expect(registry.has('mock-gen')).toBe(true);
  expect(registry.get('mock-gen')).toBe(mockGen);
});

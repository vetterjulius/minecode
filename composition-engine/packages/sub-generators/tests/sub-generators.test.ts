import { test, expect } from 'vitest';
import { SubGeneratorRegistry, BUILTIN_SUB_GENERATORS } from '../src/index.js';
import { CompositionPlan } from '@minecode/core';

test('test_SubGeneratorRegistry_BuiltinGenerators_AreLoadedCorrectly', () => {
  const registry = new SubGeneratorRegistry();
  expect(registry.list().length).toBe(BUILTIN_SUB_GENERATORS.length);
  expect(registry.has('database')).toBe(true);
  expect(registry.has('auth')).toBe(true);
  expect(registry.has('billing')).toBe(true);
  expect(registry.has('orgs')).toBe(true);
  expect(registry.has('rbac')).toBe(true);
  expect(registry.has('generic-api')).toBe(true);
  expect(registry.has('generic-ui')).toBe(true);
  expect(registry.has('navigation')).toBe(true);
  expect(registry.has('events')).toBe(true);
  expect(registry.has('extensions')).toBe(true);
  expect(registry.has('workspace')).toBe(true);
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

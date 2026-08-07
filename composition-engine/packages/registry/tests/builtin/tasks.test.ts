import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_TasksFeature_LoadedFromRegistry_ContainsTaskEntity', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('tasks');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('tasks');
  expect(feature?.type).toBe('business');
  expect(feature?.metadata.category).toBe('Collaboration');

  // Verify entities
  const entities = feature?.contract.provides?.entities || [];
  const entityNames = entities.map((e) => e.name);
  expect(entityNames).toContain('Task');

  // Verify dependencies
  const dependencies = feature?.dependencies || [];
  expect(dependencies.some((d) => d.featureId === 'database')).toBe(true);
  expect(dependencies.some((d) => d.featureId === 'projects')).toBe(true);
});

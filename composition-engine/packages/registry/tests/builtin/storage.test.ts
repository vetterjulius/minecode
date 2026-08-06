import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_StorageFeature_LoadedFromRegistry_ContainsFileEntity', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('storage');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('storage');
  expect(feature?.type).toBe('business');
  expect(feature?.metadata.category).toBe('Infrastructure');

  // Verify entities
  const entities = feature?.contract.provides?.entities || [];
  const entityNames = entities.map((e) => e.name);
  expect(entityNames).toContain('File');

  // Verify dependencies
  const dependencies = feature?.dependencies || [];
  expect(dependencies.some((d) => d.featureId === 'database')).toBe(true);
});

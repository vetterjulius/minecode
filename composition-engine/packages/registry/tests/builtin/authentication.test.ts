import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_AuthenticationFeature_LoadedFromRegistry_ContainsUserAndSessionEntities', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('authentication');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('authentication');
  expect(feature?.type).toBe('business');
  expect(feature?.metadata.category).toBe('Security');

  // Verify entities
  const entities = feature?.contract.provides?.entities || [];
  const entityNames = entities.map(e => e.name);
  expect(entityNames).toContain('User');
  expect(entityNames).toContain('Session');

  // Verify dependencies
  const dependencies = feature?.dependencies || [];
  expect(dependencies.some(d => d.featureId === 'database')).toBe(true);
});

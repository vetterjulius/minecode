import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_AuthenticationFeature_LoadedFromRegistry_ContainsProfileEntityLinkedToAuthUsers', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('authentication');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('authentication');
  expect(feature?.type).toBe('business');
  expect(feature?.metadata.category).toBe('Security');

  // Verify entities
  const entities = feature?.contract.provides?.entities || [];
  const entityNames = entities.map((e) => e.name);
  expect(entityNames).toEqual(['Profile']);

  const profile = entities.find((e) => e.name === 'Profile');
  const idField = profile?.fields?.find((f) => f.name === 'id');
  expect(idField?.references?.external).toBe('auth.users');
  expect(profile?.access).toEqual({ scope: 'owner', field: 'id' });

  // Verify dependencies
  const dependencies = feature?.dependencies || [];
  expect(dependencies.some((d) => d.featureId === 'database')).toBe(true);
});

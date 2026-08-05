import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_SearchFeature_LoadedFromRegistry_ContainsSearchPermissionsAndApis', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('search');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('search');
  expect(feature?.type).toBe('business');
  expect(feature?.metadata.category).toBe('Data');

  // Verify search permissions and API
  const permissions = feature?.contract.provides?.permissions || [];
  expect(permissions.map((p) => p.name)).toContain('search.query');

  const apis = feature?.contract.provides?.api || [];
  expect(apis.map((a) => a.path)).toContain('/api/search');

  // Verify dependencies
  const dependencies = feature?.dependencies || [];
  expect(dependencies.some((d) => d.featureId === 'database')).toBe(true);
});

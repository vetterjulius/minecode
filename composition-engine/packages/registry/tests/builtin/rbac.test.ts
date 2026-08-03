import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_RbacFeature_LoadedFromRegistry_HasSecurityCategoryAndRolesPermissions', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('rbac');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('rbac');
  expect(feature?.metadata.category).toBe('Security');

  const entities = feature?.contract.provides?.entities || [];
  const entityNames = entities.map((e) => e.name);
  expect(entityNames).toContain('Role');
  expect(entityNames).toContain('Permission');

  const dependencies = feature?.dependencies || [];
  expect(dependencies.some((d) => d.featureId === 'authentication')).toBe(true);
});

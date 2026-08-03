import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_OrganizationsFeature_LoadedFromRegistry_HasCollaborationCategoryAndEntities', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('organizations');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('organizations');
  expect(feature?.metadata.category).toBe('Collaboration');

  const entities = feature?.contract.provides?.entities || [];
  const entityNames = entities.map((e) => e.name);
  expect(entityNames).toContain('Organization');
  expect(entityNames).toContain('Membership');
  expect(entityNames).toContain('Invitation');

  const dependencies = feature?.dependencies || [];
  expect(dependencies.some((d) => d.featureId === 'authentication')).toBe(true);
});

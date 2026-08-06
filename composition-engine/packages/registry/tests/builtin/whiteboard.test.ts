import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_WhiteboardFeature_LoadedFromRegistry_ContainsWhiteboardSessionEntity', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('whiteboard');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('whiteboard');
  expect(feature?.type).toBe('business');
  expect(feature?.metadata.category).toBe('Collaboration');

  // Verify entities
  const entities = feature?.contract.provides?.entities || [];
  const entityNames = entities.map((e) => e.name);
  expect(entityNames).toContain('WhiteboardSession');

  // Verify dependencies
  const dependencies = feature?.dependencies || [];
  expect(dependencies.some((d) => d.featureId === 'database')).toBe(true);
  expect(dependencies.some((d) => d.featureId === 'organizations')).toBe(true);
});

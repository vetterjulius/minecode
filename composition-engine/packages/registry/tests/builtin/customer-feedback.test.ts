import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_CustomerFeedbackFeature_LoadedFromRegistry_ContainsFeedbackEntity', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('customer-feedback');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('customer-feedback');
  expect(feature?.type).toBe('business');
  expect(feature?.metadata.category).toBe('Support');

  // Verify entities
  const entities = feature?.contract.provides?.entities || [];
  const entityNames = entities.map((e) => e.name);
  expect(entityNames).toContain('Feedback');

  // Verify dependencies
  const dependencies = feature?.dependencies || [];
  expect(dependencies.some((d) => d.featureId === 'database')).toBe(true);
  expect(dependencies.some((d) => d.featureId === 'organizations')).toBe(true);
});

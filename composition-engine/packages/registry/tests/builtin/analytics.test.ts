import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_AnalyticsFeature_LoadedFromRegistry_ContainsMetricEntity', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('analytics');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('analytics');
  expect(feature?.type).toBe('business');
  expect(feature?.metadata.category).toBe('Business Intelligence');

  // Verify entities
  const entities = feature?.contract.provides?.entities || [];
  const entityNames = entities.map((e) => e.name);
  expect(entityNames).toContain('Metric');

  // Verify dependencies
  const dependencies = feature?.dependencies || [];
  expect(dependencies.some((d) => d.featureId === 'database')).toBe(true);
  expect(dependencies.some((d) => d.featureId === 'organizations')).toBe(true);
});

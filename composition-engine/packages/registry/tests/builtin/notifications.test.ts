import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_NotificationsFeature_LoadedFromRegistry_ContainsNotificationEntity', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('notifications');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('notifications');
  expect(feature?.type).toBe('business');
  expect(feature?.metadata.category).toBe('Communication');

  // Verify entities
  const entities = feature?.contract.provides?.entities || [];
  const entityNames = entities.map((e) => e.name);
  expect(entityNames).toContain('Notification');

  // Verify dependencies
  const dependencies = feature?.dependencies || [];
  expect(dependencies.some((d) => d.featureId === 'database')).toBe(true);
  expect(dependencies.some((d) => d.featureId === 'authentication')).toBe(true);
});

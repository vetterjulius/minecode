import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_AuditLoggingFeature_LoadedFromRegistry_ContainsAuditLogEntity', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('audit-logging');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('audit-logging');
  expect(feature?.type).toBe('business');
  expect(feature?.metadata.category).toBe('Security');

  // Verify entities
  const entities = feature?.contract.provides?.entities || [];
  const entityNames = entities.map((e) => e.name);
  expect(entityNames).toContain('AuditLog');

  // Verify dependencies
  const dependencies = feature?.dependencies || [];
  expect(dependencies.some((d) => d.featureId === 'database')).toBe(true);
});

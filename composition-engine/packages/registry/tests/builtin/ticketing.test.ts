import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_TicketingFeature_LoadedFromRegistry_ContainsTicketEntity', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('ticketing');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('ticketing');
  expect(feature?.type).toBe('business');
  expect(feature?.metadata.category).toBe('Support');

  // Verify entities
  const entities = feature?.contract.provides?.entities || [];
  const entityNames = entities.map((e) => e.name);
  expect(entityNames).toContain('Ticket');

  // Verify dependencies
  const dependencies = feature?.dependencies || [];
  expect(dependencies.some((d) => d.featureId === 'database')).toBe(true);
  expect(dependencies.some((d) => d.featureId === 'organizations')).toBe(true);
});

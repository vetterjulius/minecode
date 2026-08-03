import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_BillingFeature_LoadedFromRegistry_DependsOnOrganizationsAndHasStripe', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('billing');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('billing');
  expect(feature?.metadata.category).toBe('Commerce');

  const entities = feature?.contract.provides?.entities || [];
  const entityNames = entities.map(e => e.name);
  expect(entityNames).toContain('StripeCustomer');
  expect(entityNames).toContain('Subscription');

  const dependencies = feature?.dependencies || [];
  expect(dependencies.some(d => d.featureId === 'organizations')).toBe(true);
});

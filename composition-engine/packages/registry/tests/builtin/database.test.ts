import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_DatabaseFeature_LoadedFromRegistry_HasCorrectMetadataAndCapabilities', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('database');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('database');
  expect(feature?.version).toBe('1.0.0');
  expect(feature?.type).toBe('primitive');
  expect(feature?.metadata.name).toBe('Database Primitive');
  expect(feature?.metadata.category).toBe('Infrastructure');
  expect(feature?.contract.provides?.capabilities).toContain('database');
});

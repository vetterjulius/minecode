import { test, expect } from 'vitest';
import { FileSystemRegistry } from '../../src/index.js';

test('test_AiChatFeature_LoadedFromRegistry_ContainsChatMessageEntity', () => {
  const registry = new FileSystemRegistry('composition-engine/features');
  registry.load();

  const feature = registry.getFeature('ai-chat');
  expect(feature).toBeDefined();
  expect(feature?.id).toBe('ai-chat');
  expect(feature?.type).toBe('business');
  expect(feature?.metadata.category).toBe('Artificial Intelligence');

  // Verify entities
  const entities = feature?.contract.provides?.entities || [];
  const entityNames = entities.map((e) => e.name);
  expect(entityNames).toContain('ChatMessage');

  // Verify dependencies
  const dependencies = feature?.dependencies || [];
  expect(dependencies.some((d) => d.featureId === 'database')).toBe(true);
});

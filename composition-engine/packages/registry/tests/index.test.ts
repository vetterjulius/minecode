import { test, expect } from 'vitest';
import { getRegistryInfo } from '../src/index.js';

test('test_GetRegistryInfo_NoArguments_ReturnsRegistryInfoWithSchemaInfo', () => {
  const result = getRegistryInfo();
  expect(result).toBe(
    'Minecode Registry relying on: Minecode Schemas relying on: Minecode Core version 0.1.0'
  );
});

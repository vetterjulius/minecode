import { test, expect } from 'vitest';
import { getSchemaInfo } from '../src/index.js';

test('test_GetSchemaInfo_NoArguments_ReturnsSchemaInfoWithCoreInfo', () => {
  const result = getSchemaInfo();
  expect(result).toBe('Minecode Schemas relying on: Minecode Core version 0.1.0');
});

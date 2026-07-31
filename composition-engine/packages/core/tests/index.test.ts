import { test, expect } from 'vitest';
import { getCoreInfo } from '../src/index.js';

test('test_GetCoreInfo_NoArguments_ReturnsVersionString', () => {
  const result = getCoreInfo();
  expect(result).toBe('Minecode Core version 0.1.0');
});

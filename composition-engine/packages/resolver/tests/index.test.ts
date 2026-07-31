import { test, expect } from 'vitest';
import { getResolverInfo } from '../src/index.js';

test('test_GetResolverInfo_NoArguments_ReturnsResolverInfo', () => {
  const result = getResolverInfo();
  expect(result).toBe(
    'Minecode Resolver relying on: Minecode Registry relying on: Minecode Schemas relying on: Minecode Core version 0.1.0'
  );
});

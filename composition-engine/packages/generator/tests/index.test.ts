import { test, expect } from 'vitest';
import { getGeneratorInfo } from '../src/index.js';

test('test_GetGeneratorInfo_NoArguments_ReturnsGeneratorInfo', () => {
  const result = getGeneratorInfo();
  expect(result).toBe(
    'Minecode Generator relying on: Minecode Composer relying on: Minecode Resolver relying on: Minecode Registry relying on: Minecode Schemas relying on: Minecode Core version 0.1.0'
  );
});

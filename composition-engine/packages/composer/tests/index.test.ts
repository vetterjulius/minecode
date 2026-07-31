import { test, expect } from 'vitest';
import { getComposerInfo } from '../src/index.js';

test('test_GetComposerInfo_NoArguments_ReturnsComposerInfo', () => {
  const result = getComposerInfo();
  expect(result).toBe(
    'Minecode Composer relying on: Minecode Resolver relying on: Minecode Registry relying on: Minecode Schemas relying on: Minecode Core version 0.1.0'
  );
});

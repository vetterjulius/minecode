import { test, expect, vi } from 'vitest';
import { runCLI } from '../src/main.js';

test('test_RunCLI_NoArguments_ReturnsCLIInfoAndLogs', () => {
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const result = runCLI();
  expect(result).toContain('Minecode CLI initialised.');
  expect(consoleSpy).toHaveBeenCalledWith(result);
  consoleSpy.mockRestore();
});

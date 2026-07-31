import { test, expect, vi } from 'vitest';
import { runMCPServer } from '../src/main.js';

test('test_RunMCPServer_NoArguments_ReturnsMCPServerInfoAndLogs', () => {
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const result = runMCPServer();
  expect(result).toContain('Minecode MCP Server initialised.');
  expect(consoleSpy).toHaveBeenCalledWith(result);
  consoleSpy.mockRestore();
});

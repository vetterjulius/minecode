/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runMCPServer, server, registry } from '../src/main.js';
import { Feature } from '@minecode/core';

test('test_RunMCPServer_NoArguments_ReturnsMCPServerInfoAndLogs', () => {
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const result = runMCPServer();
  expect(result).toContain('Minecode MCP Server initialised.');
  expect(consoleSpy).toHaveBeenCalledWith(result);
  consoleSpy.mockRestore();
});

test('test_ListFeatures_NoParameters_ReturnsCompactFeatureList', async () => {
  const mockFeatures: Feature[] = [
    {
      id: 'auth',
      version: '1.0.0',
      type: 'business',
      metadata: {
        name: 'Authentication',
        description: 'User authentication',
        category: 'security',
      },
      contract: {},
      dependencies: [],
      modules: [],
    },
  ];
  const spy = vi.spyOn(registry, 'listFeatures').mockReturnValue(mockFeatures);

  const handlers = (server as any)._requestHandlers;
  const listToolsHandler = handlers.get('tools/list');
  const callToolHandler = handlers.get('tools/call');

  expect(listToolsHandler).toBeDefined();
  expect(callToolHandler).toBeDefined();

  // Call tools/list
  const toolsResponse = await listToolsHandler({ method: 'tools/list' });
  // Now includes our 3 new tools, so total is 4 + 3 = 7
  expect(toolsResponse.tools).toHaveLength(7);

  // Call tools/call for list_features
  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'list_features',
    },
  });

  expect(response.isError).toBeFalsy();
  const text = response.content[0].text;
  const result = JSON.parse(text);
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe('auth');
  expect(result[0].metadata.name).toBe('Authentication');
  expect(result[0].contract).toBeUndefined();

  spy.mockRestore();
});

test('test_GetFeature_ValidId_ReturnsFullFeatureJson', async () => {
  const mockFeature: Feature = {
    id: 'auth',
    version: '1.0.0',
    type: 'business',
    metadata: {
      name: 'Authentication',
      description: 'User authentication',
      category: 'security',
    },
    contract: { provides: { capabilities: ['login'] } },
    dependencies: [],
    modules: [],
  };
  const spy = vi.spyOn(registry, 'getFeature').mockReturnValue(mockFeature);

  const handlers = (server as any)._requestHandlers;
  const callToolHandler = handlers.get('tools/call');

  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'get_feature',
      arguments: { id: 'auth' },
    },
  });

  expect(response.isError).toBeFalsy();
  const result = JSON.parse(response.content[0].text);
  expect(result.id).toBe('auth');
  expect(result.contract.provides.capabilities).toContain('login');

  spy.mockRestore();
});

test('test_GetFeature_InvalidId_ReturnsErrorResponse', async () => {
  const spy = vi.spyOn(registry, 'getFeature').mockReturnValue(undefined);

  const handlers = (server as any)._requestHandlers;
  const callToolHandler = handlers.get('tools/call');

  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'get_feature',
      arguments: { id: 'non-existent' },
    },
  });

  expect(response.isError).toBe(true);
  expect(response.content[0].text).toContain("Feature with ID 'non-existent' not found");

  spy.mockRestore();
});

test('test_GetFeature_MissingId_ReturnsErrorResponse', async () => {
  const handlers = (server as any)._requestHandlers;
  const callToolHandler = handlers.get('tools/call');

  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'get_feature',
      arguments: {},
    },
  });

  expect(response.isError).toBe(true);
  expect(response.content[0].text).toContain('Feature ID is required');
});

test('test_SearchFeatures_QueryMatches_ReturnsFilteredCompactFeatureList', async () => {
  const mockFeatures: Feature[] = [
    {
      id: 'auth',
      version: '1.0.0',
      type: 'business',
      metadata: {
        name: 'Authentication',
        description: 'User authentication',
        category: 'security',
      },
      contract: {},
      dependencies: [],
      modules: [],
    },
  ];
  const spy = vi.spyOn(registry, 'searchFeatures').mockReturnValue(mockFeatures);

  const handlers = (server as any)._requestHandlers;
  const callToolHandler = handlers.get('tools/call');

  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'search_features',
      arguments: { query: 'auth' },
    },
  });

  expect(response.isError).toBeFalsy();
  const result = JSON.parse(response.content[0].text);
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe('auth');

  spy.mockRestore();
});

test('test_SearchFeatures_QueryNoMatches_ReturnsInfoMessage', async () => {
  const spy = vi.spyOn(registry, 'searchFeatures').mockReturnValue([]);

  const handlers = (server as any)._requestHandlers;
  const callToolHandler = handlers.get('tools/call');

  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'search_features',
      arguments: { query: 'empty_query' },
    },
  });

  expect(response.isError).toBeFalsy();
  expect(response.content[0].text).toContain("No features found matching the query 'empty_query'");

  spy.mockRestore();
});

test('test_SearchFeatures_MissingQuery_ReturnsErrorResponse', async () => {
  const handlers = (server as any)._requestHandlers;
  const callToolHandler = handlers.get('tools/call');

  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'search_features',
      arguments: {},
    },
  });

  expect(response.isError).toBe(true);
  expect(response.content[0].text).toContain('Search query is required');
});

test('test_GetFeatureSchema_HasSchema_ReturnsConfigSchemaJson', async () => {
  const mockFeature: Feature = {
    id: 'auth',
    version: '1.0.0',
    type: 'business',
    metadata: {
      name: 'Authentication',
      description: 'User authentication',
      category: 'security',
    },
    contract: {},
    dependencies: [],
    modules: [],
    configSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string' },
      },
    },
  };
  const spy = vi.spyOn(registry, 'getFeature').mockReturnValue(mockFeature);

  const handlers = (server as any)._requestHandlers;
  const callToolHandler = handlers.get('tools/call');

  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'get_feature_schema',
      arguments: { id: 'auth' },
    },
  });

  expect(response.isError).toBeFalsy();
  const result = JSON.parse(response.content[0].text);
  expect(result.type).toBe('object');
  expect(result.properties.provider.type).toBe('string');

  spy.mockRestore();
});

test('test_GetFeatureSchema_NoSchema_ReturnsErrorResponse', async () => {
  const mockFeature: Feature = {
    id: 'auth',
    version: '1.0.0',
    type: 'business',
    metadata: {
      name: 'Authentication',
      description: 'User authentication',
      category: 'security',
    },
    contract: {},
    dependencies: [],
    modules: [],
  };
  const spy = vi.spyOn(registry, 'getFeature').mockReturnValue(mockFeature);

  const handlers = (server as any)._requestHandlers;
  const callToolHandler = handlers.get('tools/call');

  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'get_feature_schema',
      arguments: { id: 'auth' },
    },
  });

  expect(response.isError).toBe(true);
  expect(response.content[0].text).toContain(
    "Feature 'auth' does not define a configuration schema"
  );

  spy.mockRestore();
});

test('test_GetFeatureSchema_InvalidId_ReturnsErrorResponse', async () => {
  const spy = vi.spyOn(registry, 'getFeature').mockReturnValue(undefined);

  const handlers = (server as any)._requestHandlers;
  const callToolHandler = handlers.get('tools/call');

  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'get_feature_schema',
      arguments: { id: 'non-existent' },
    },
  });

  expect(response.isError).toBe(true);
  expect(response.content[0].text).toContain("Feature with ID 'non-existent' not found");

  spy.mockRestore();
});

// New tests for validate_blueprint, resolve_blueprint, and compose_application

test('test_ValidateBlueprint_ValidBlueprint_ReturnsValidTrue', async () => {
  const mockFeature: Feature = {
    id: 'auth',
    version: '1.0.0',
    type: 'business',
    metadata: {
      name: 'Authentication',
      description: 'User authentication',
      category: 'security',
      stack: ['nextjs-supabase'],
    },
    contract: {},
    dependencies: [],
    modules: [],
  };
  const spy = vi.spyOn(registry, 'getFeature').mockReturnValue(mockFeature);

  const blueprintStr = `
application:
  name: test-app
stack:
  id: nextjs-supabase
features:
  auth:
    version: "^1.0.0"
  `;

  const callToolHandler = (server as any)._requestHandlers.get('tools/call');
  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'validate_blueprint',
      arguments: { blueprint: blueprintStr },
    },
  });

  expect(response.isError).toBeFalsy();
  const result = JSON.parse(response.content[0].text);
  expect(result.valid).toBe(true);
  expect(result.errors).toHaveLength(0);

  spy.mockRestore();
});

test('test_ValidateBlueprint_InvalidYaml_ReturnsValidFalseWithParsingError', async () => {
  const blueprintStr = `
application:
  name: test-app
  invalid_yaml: : : :
  `;

  const callToolHandler = (server as any)._requestHandlers.get('tools/call');
  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'validate_blueprint',
      arguments: { blueprint: blueprintStr },
    },
  });

  expect(response.isError).toBeFalsy();
  const result = JSON.parse(response.content[0].text);
  expect(result.valid).toBe(false);
  expect(result.errors[0]).toContain('YAML Syntax Error');
});

test('test_ValidateBlueprint_IncompatibleVersion_ReturnsValidFalseWithValidationError', async () => {
  const mockFeature: Feature = {
    id: 'auth',
    version: '1.0.0',
    type: 'business',
    metadata: {
      name: 'Authentication',
      description: 'User authentication',
      category: 'security',
    },
    contract: {},
    dependencies: [],
    modules: [],
  };
  const spy = vi.spyOn(registry, 'getFeature').mockReturnValue(mockFeature);

  const blueprintStr = `
application:
  name: test-app
features:
  auth:
    version: "^2.0.0"
  `;

  const callToolHandler = (server as any)._requestHandlers.get('tools/call');
  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'validate_blueprint',
      arguments: { blueprint: blueprintStr },
    },
  });

  expect(response.isError).toBeFalsy();
  const result = JSON.parse(response.content[0].text);
  expect(result.valid).toBe(false);
  expect(result.errors[0]).toContain('does not satisfy requested version constraint');

  spy.mockRestore();
});

test('test_ValidateBlueprint_FeatureConflict_ReturnsValidFalseWithConflictErrors', async () => {
  const mockFeatures: Record<string, Feature> = {
    auth: {
      id: 'auth',
      version: '1.0.0',
      type: 'business',
      metadata: { name: 'Auth', description: '' },
      contract: { provides: { capabilities: ['identity'] } },
      dependencies: [],
      modules: [],
    },
    oauth: {
      id: 'oauth',
      version: '1.0.0',
      type: 'business',
      metadata: { name: 'OAuth', description: '' },
      contract: { provides: { capabilities: ['identity'] } },
      dependencies: [],
      modules: [],
    },
  };
  const spy = vi.spyOn(registry, 'getFeature').mockImplementation((id) => mockFeatures[id]);

  const blueprintStr = `
application:
  name: test-app
features:
  auth:
    version: "1.0.0"
  oauth:
    version: "1.0.0"
  `;

  const callToolHandler = (server as any)._requestHandlers.get('tools/call');
  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'validate_blueprint',
      arguments: { blueprint: blueprintStr },
    },
  });

  expect(response.isError).toBeFalsy();
  const result = JSON.parse(response.content[0].text);
  expect(result.valid).toBe(false);
  expect(result.errors[0]).toContain("Duplicate capability 'identity'");

  spy.mockRestore();
});

test('test_ResolveBlueprint_ValidBlueprint_ReturnsCompactFeatureList', async () => {
  const mockFeature: Feature = {
    id: 'auth',
    version: '1.0.0',
    type: 'business',
    metadata: {
      name: 'Authentication',
      description: 'User authentication',
      category: 'security',
    },
    contract: {},
    dependencies: [],
    modules: [],
  };
  const spy = vi.spyOn(registry, 'getFeature').mockReturnValue(mockFeature);

  const blueprintStr = `
application:
  name: test-app
features:
  auth:
    version: "1.0.0"
  `;

  const callToolHandler = (server as any)._requestHandlers.get('tools/call');
  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'resolve_blueprint',
      arguments: { blueprint: blueprintStr },
    },
  });

  expect(response.isError).toBeFalsy();
  const result = JSON.parse(response.content[0].text);
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe('auth');
  expect(result[0].version).toBe('1.0.0');

  spy.mockRestore();
});

test('test_ResolveBlueprint_InvalidBlueprint_ReturnsErrorResponse', async () => {
  const blueprintStr = `
application:
  name: test-app
  invalid_yaml: : : :
  `;

  const callToolHandler = (server as any)._requestHandlers.get('tools/call');
  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'resolve_blueprint',
      arguments: { blueprint: blueprintStr },
    },
  });

  expect(response.isError).toBe(true);
  expect(response.content[0].text).toContain('Blueprint resolution failed');
});

test('test_ComposeApplication_ValidBlueprint_WritesFilesAndReturnsFileList', async () => {
  const mockFeature: Feature = {
    id: 'auth',
    version: '1.0.0',
    type: 'business',
    metadata: {
      name: 'Authentication',
      description: 'User authentication',
      category: 'security',
    },
    contract: {
      provides: {
        entities: [
          {
            name: 'User',
            fields: [{ name: 'id', type: 'uuid', required: true }],
          },
        ],
      },
    },
    dependencies: [],
    modules: [],
  };
  const spy = vi.spyOn(registry, 'getFeature').mockReturnValue(mockFeature);

  const tempOutDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-test-composition-'));

  const blueprintStr = `
application:
  name: compose-test
features:
  auth:
    version: "1.0.0"
  `;

  const callToolHandler = (server as any)._requestHandlers.get('tools/call');
  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'compose_application',
      arguments: { blueprint: blueprintStr, outDir: tempOutDir },
    },
  });

  expect(response.isError).toBeFalsy();
  const result = JSON.parse(response.content[0].text);
  expect(result.success).toBe(true);
  expect(result.outDir).toBe(tempOutDir);
  expect(result.files).toContain('supabase/migrations/user_table.sql');

  // Verify that a file was physically written
  const userTableFile = path.join(tempOutDir, 'supabase/migrations/user_table.sql');
  expect(fs.existsSync(userTableFile)).toBe(true);
  const content = fs.readFileSync(userTableFile, 'utf8');
  expect(content).toContain('CREATE TABLE IF NOT EXISTS "user"');

  // Clean up
  fs.rmSync(tempOutDir, { recursive: true, force: true });
  spy.mockRestore();
});

test('test_ComposeApplication_WithRunnableFalse_DoesNotWriteConfigsAndPage', async () => {
  const mockFeature: Feature = {
    id: 'auth',
    version: '1.0.0',
    type: 'business',
    metadata: {
      name: 'Authentication',
      description: 'User authentication',
      category: 'security',
    },
    contract: {
      provides: {
        entities: [
          {
            name: 'User',
            fields: [{ name: 'id', type: 'uuid', required: true }],
          },
        ],
      },
    },
    dependencies: [],
    modules: [],
  };
  const spy = vi.spyOn(registry, 'getFeature').mockReturnValue(mockFeature);

  const tempOutDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-test-composition-no-run-'));

  const blueprintStr = `
application:
  name: compose-test-no-run
features:
  auth:
    version: "1.0.0"
  `;

  const callToolHandler = (server as any)._requestHandlers.get('tools/call');
  const response = await callToolHandler({
    method: 'tools/call',
    params: {
      name: 'compose_application',
      arguments: { blueprint: blueprintStr, outDir: tempOutDir, runnable: false },
    },
  });

  expect(response.isError).toBeFalsy();
  const result = JSON.parse(response.content[0].text);
  expect(result.success).toBe(true);
  expect(result.files).not.toContain('package.json');
  expect(result.files).not.toContain('tsconfig.json');

  expect(fs.existsSync(path.join(tempOutDir, 'package.json'))).toBe(false);
  expect(fs.existsSync(path.join(tempOutDir, 'tsconfig.json'))).toBe(false);

  // Clean up
  fs.rmSync(tempOutDir, { recursive: true, force: true });
  spy.mockRestore();
});

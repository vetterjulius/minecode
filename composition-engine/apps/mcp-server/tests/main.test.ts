/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi } from 'vitest';
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
  expect(toolsResponse.tools).toHaveLength(4);

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

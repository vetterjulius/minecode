import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getGeneratorInfo } from '@minecode/generator';
import { FileSystemRegistry } from '@minecode/registry';

let registryLoadError: Error | null = null;
const featuresDir =
  process.env.MINECODE_FEATURES_DIR || process.env.FEATURES_DIR || 'composition-engine/features';
const registry = new FileSystemRegistry(featuresDir);

try {
  registry.load();
} catch (error: unknown) {
  registryLoadError = error instanceof Error ? error : new Error(String(error));
  console.error('Failed to load registry:', registryLoadError);
}

const server = new Server(
  {
    name: 'minecode-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_features',
        description: 'List all available features in the registry with key metadata',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_feature',
        description: 'Retrieve detailed information for a specific feature by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The unique identifier of the feature',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_features',
        description:
          'Search for features case-insensitively across ID, name, description, and category',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query string',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_feature_schema',
        description:
          'Retrieve the configuration schema (configSchema) for a specific feature by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The unique identifier of the feature',
            },
          },
          required: ['id'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (registryLoadError) {
    return {
      content: [
        {
          type: 'text',
          text: `Registry failed to load due to a schema validation or parsing error:\n${registryLoadError.message}`,
        },
      ],
      isError: true,
    };
  }

  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_features': {
        const features = registry.listFeatures();
        const compactFeatures = features.map((f) => ({
          id: f.id,
          version: f.version,
          type: f.type,
          metadata: {
            name: f.metadata?.name,
            description: f.metadata?.description,
            category: f.metadata?.category,
          },
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(compactFeatures, null, 2),
            },
          ],
        };
      }

      case 'get_feature': {
        const id = args?.id;
        if (typeof id !== 'string' || !id) {
          return {
            content: [
              {
                type: 'text',
                text: 'Feature ID is required and must be a non-empty string.',
              },
            ],
            isError: true,
          };
        }

        const feature = registry.getFeature(id);
        if (!feature) {
          return {
            content: [
              {
                type: 'text',
                text: `Feature with ID '${id}' not found.`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(feature, null, 2),
            },
          ],
        };
      }

      case 'search_features': {
        const query = args?.query;
        if (typeof query !== 'string') {
          return {
            content: [
              {
                type: 'text',
                text: 'Search query is required and must be a string.',
              },
            ],
            isError: true,
          };
        }

        const results = registry.searchFeatures(query);
        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No features found matching the query '${query}'.`,
              },
            ],
            isError: false,
          };
        }

        const compactResults = results.map((f) => ({
          id: f.id,
          version: f.version,
          type: f.type,
          metadata: {
            name: f.metadata?.name,
            description: f.metadata?.description,
            category: f.metadata?.category,
          },
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(compactResults, null, 2),
            },
          ],
        };
      }

      case 'get_feature_schema': {
        const id = args?.id;
        if (typeof id !== 'string' || !id) {
          return {
            content: [
              {
                type: 'text',
                text: 'Feature ID is required and must be a non-empty string.',
              },
            ],
            isError: true,
          };
        }

        const feature = registry.getFeature(id);
        if (!feature) {
          return {
            content: [
              {
                type: 'text',
                text: `Feature with ID '${id}' not found.`,
              },
            ],
            isError: true,
          };
        }

        if (!feature.configSchema) {
          return {
            content: [
              {
                type: 'text',
                text: `Feature '${id}' does not define a configuration schema.`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(feature.configSchema, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: message,
        },
      ],
      isError: true,
    };
  }
});

async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Minecode MCP Server running on stdio');
}

export function runMCPServer(): string {
  const info = `Minecode MCP Server initialised.\nUsing: ${getGeneratorInfo()}`;
  console.log(info);

  if (!process.env.VITEST) {
    startServer().catch((err) => {
      console.error('Fatal error in MCP Server:', err);
    });
  }

  return info;
}

runMCPServer();

export { server, registry, registryLoadError };

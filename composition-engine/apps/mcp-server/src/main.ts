/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getGeneratorInfo, ApplicationGenerator, NextJsSupabaseAdapter } from '@minecode/generator';
import { FileSystemRegistry } from '@minecode/registry';
import * as path from 'path';
import { parseBlueprintYaml } from '@minecode/schemas';
import {
  BlueprintValidator,
  FeatureDependencyResolver,
  FeatureConflictDetector,
} from '@minecode/resolver';
import { Composer } from '@minecode/composer';

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

// Helper to validate, resolve and detect conflicts for a blueprint
function processBlueprint(blueprintStr: string) {
  const errors: string[] = [];
  const warnings: string[] = [];
  let blueprint: any = null;
  let resolvedFeatures: any[] = [];

  try {
    blueprint = parseBlueprintYaml(blueprintStr);
  } catch (error: any) {
    errors.push(error.message || String(error));
    return { valid: false, errors, warnings, blueprint, resolvedFeatures };
  }

  // 1. Blueprint Validation
  const validator = new BlueprintValidator(registry);
  const valResult = validator.validate(blueprint);
  errors.push(...valResult.errors);
  warnings.push(...valResult.warnings);

  if (errors.length > 0) {
    return { valid: false, errors, warnings, blueprint, resolvedFeatures };
  }

  // 2. Resolve Blueprint Features
  try {
    const resolver = new FeatureDependencyResolver(registry);
    resolvedFeatures = resolver.resolve(blueprint);
  } catch (error: any) {
    errors.push(error.message || String(error));
    return { valid: false, errors, warnings, blueprint, resolvedFeatures };
  }

  // 3. Detect Conflicts
  try {
    const conflictDetector = new FeatureConflictDetector();
    const stackId = blueprint.stackId || 'nextjs-supabase';
    conflictDetector.detect(resolvedFeatures, stackId);
  } catch (error: any) {
    if (error.conflicts && Array.isArray(error.conflicts)) {
      errors.push(...error.conflicts);
    } else {
      errors.push(error.message || String(error));
    }
    return { valid: false, errors, warnings, blueprint, resolvedFeatures };
  }

  return {
    valid: true,
    errors,
    warnings,
    blueprint,
    resolvedFeatures,
  };
}

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
      {
        name: 'validate_blueprint',
        description:
          'Validate an application blueprint (YAML/JSON) for correctness, dependencies, version/stack compatibility, and feature conflicts',
        inputSchema: {
          type: 'object',
          properties: {
            blueprint: {
              type: 'string',
              description:
                'YAML or JSON string representing the application blueprint to validate',
            },
          },
          required: ['blueprint'],
        },
      },
      {
        name: 'resolve_blueprint',
        description:
          'Resolve and topologically sort features defined in an application blueprint (YAML/JSON)',
        inputSchema: {
          type: 'object',
          properties: {
            blueprint: {
              type: 'string',
              description:
                'YAML or JSON string representing the application blueprint to resolve',
            },
          },
          required: ['blueprint'],
        },
      },
      {
        name: 'compose_application',
        description:
          'Validate, resolve, and compose an application blueprint into structured files written to physical disk',
        inputSchema: {
          type: 'object',
          properties: {
            blueprint: {
              type: 'string',
              description:
                'YAML or JSON string representing the application blueprint to compose',
            },
            outDir: {
              type: 'string',
              description:
                "The directory where the application will be written. Defaults to 'generated-app'.",
            },
          },
          required: ['blueprint'],
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

  const { name, arguments: args } = request.params as { name: string; arguments?: Record<string, any> };

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

      case 'validate_blueprint': {
        const blueprintStr = args?.blueprint;
        if (typeof blueprintStr !== 'string' || !blueprintStr) {
          return {
            content: [
              {
                type: 'text',
                text: 'Blueprint content is required and must be a non-empty string.',
              },
            ],
            isError: true,
          };
        }

        const result = processBlueprint(blueprintStr);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  valid: result.valid,
                  errors: result.errors,
                  warnings: result.warnings,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'resolve_blueprint': {
        const blueprintStr = args?.blueprint;
        if (typeof blueprintStr !== 'string' || !blueprintStr) {
          return {
            content: [
              {
                type: 'text',
                text: 'Blueprint content is required and must be a non-empty string.',
              },
            ],
            isError: true,
          };
        }

        const result = processBlueprint(blueprintStr);
        if (!result.valid) {
          return {
            content: [
              {
                type: 'text',
                text: `Blueprint resolution failed:\n${result.errors.map((e) => `  - ${e}`).join('\n')}`,
              },
            ],
            isError: true,
          };
        }

        const compactFeatures = result.resolvedFeatures.map((f) => ({
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

      case 'compose_application': {
        const blueprintStr = args?.blueprint;
        if (typeof blueprintStr !== 'string' || !blueprintStr) {
          return {
            content: [
              {
                type: 'text',
                text: 'Blueprint content is required and must be a non-empty string.',
              },
            ],
            isError: true,
          };
        }

        const outDir = args?.outDir || 'generated-app';

        const result = processBlueprint(blueprintStr);
        if (!result.valid) {
          return {
            content: [
              {
                type: 'text',
                text: `Blueprint validation failed before composition:\n${result.errors.map((e) => `  - ${e}`).join('\n')}`,
              },
            ],
            isError: true,
          };
        }

        // 1. Compose application
        const composer = new Composer();
        const plan = composer.compose(result.resolvedFeatures, result.blueprint);

        // 2. Generate application files
        const generator = new ApplicationGenerator(outDir);
        generator.generate(plan);

        // 3. Build list of files written
        const adapter = new NextJsSupabaseAdapter();
        const virtualFiles = adapter.generate(plan);
        const writtenPaths: string[] = [];

        for (const relPath of Object.keys(virtualFiles)) {
          let physicalRelPath: string;
          if (relPath.startsWith('app/')) {
            physicalRelPath = relPath;
          } else if (relPath.startsWith('config/')) {
            physicalRelPath = relPath;
          } else if (relPath.startsWith('types/') || relPath.startsWith('components/')) {
            physicalRelPath = path.join('generated', relPath);
          } else if (relPath.startsWith('supabase/migrations/')) {
            physicalRelPath = relPath;
          } else {
            physicalRelPath = path.join('generated', relPath);
          }
          writtenPaths.push(physicalRelPath);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Application '${plan.applicationName}' successfully composed and written to '${outDir}'.`,
                  outDir,
                  files: writtenPaths,
                },
                null,
                2
              ),
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

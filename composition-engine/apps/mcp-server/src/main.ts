/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  getGeneratorInfo,
  ApplicationGenerator,
  createDefaultStackRegistry,
} from '@minecode/generator';
import {
  FileSystemRegistry,
  discoverFeaturePackages,
  loadStackBehaviors,
} from '@minecode/registry';
import { parseBlueprintYaml } from '@minecode/schemas';
import {
  BlueprintValidator,
  FeatureDependencyResolver,
  FeatureConflictDetector,
} from '@minecode/resolver';
import { Composer } from '@minecode/composer';
import { DEFAULT_STACK_ID } from '@minecode/core';
import {
  AUTHORING_GUIDE,
  PROVIDER_KINDS,
  findProviders,
  listStacks,
  planApplication,
  suggestFeatures,
  type ProviderKind,
} from './agent-tools.js';

let registryLoadError: Error | null = null;
const featuresDir =
  process.env.MINECODE_FEATURES_DIR || process.env.FEATURES_DIR || 'composition-engine/features';
// Feature packages (npm) installed in the project directory contribute features and stack behaviors.
const projectDir = process.env.MINECODE_PROJECT_DIR || process.cwd();
const featurePackages = discoverFeaturePackages(projectDir);
const registry = new FileSystemRegistry([
  featuresDir,
  ...featurePackages.flatMap((p) => (p.featuresDir ? [p.featuresDir] : [])),
]);
const stacks = createDefaultStackRegistry();
const stacksReady: Promise<void> = (async () => {
  for (const pkg of featurePackages) {
    for (const stackId of Object.keys(pkg.stackModules)) {
      const adapter = stacks.list().find((s) => s.stackId === stackId);
      adapter?.registerBehaviors?.(await loadStackBehaviors(pkg, stackId));
    }
  }
})();

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
    const stackId = blueprint.stackId || DEFAULT_STACK_ID;
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
              description: 'YAML or JSON string representing the application blueprint to validate',
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
              description: 'YAML or JSON string representing the application blueprint to resolve',
            },
          },
          required: ['blueprint'],
        },
      },
      {
        name: 'list_stacks',
        description:
          'List the target stacks this engine can generate for, including the behaviors each implements',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'find_provider',
        description:
          'Find which features provide an entity, capability, permission, api path/name, behavior id or hook (e.g. kind=entity name=Invoice)',
        inputSchema: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: [...PROVIDER_KINDS] },
            name: { type: 'string', description: 'Name or path to look for (case-insensitive)' },
          },
          required: ['kind', 'name'],
        },
      },
      {
        name: 'get_authoring_guide',
        description:
          'Read this first: how to describe an application with a blueprint, the workflow with these tools, and the rules of the generated app',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'plan_application',
        description:
          'Dry run: validate and compose a blueprint and report the entities, endpoints, permissions and extension hooks the engine decided on, plus anything the stack cannot implement. Writes no files.',
        inputSchema: {
          type: 'object',
          properties: {
            blueprint: { type: 'string', description: 'YAML or JSON blueprint' },
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
              description: 'YAML or JSON string representing the application blueprint to compose',
            },
            outDir: {
              type: 'string',
              description:
                "The directory where the application will be written. Defaults to 'generated-app'.",
            },
            runnable: {
              type: 'boolean',
              description:
                'Whether to generate a fully runnable workspace layout (package.json, config files, pages). Defaults to true.',
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

  const { name, arguments: args } = request.params as {
    name: string;
    arguments?: Record<string, any>;
  };

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

      case 'list_stacks':
        return { content: [{ type: 'text', text: JSON.stringify(listStacks(stacks), null, 2) }] };

      case 'get_authoring_guide':
        return { content: [{ type: 'text', text: AUTHORING_GUIDE }] };

      case 'find_provider': {
        const kind = args?.kind as ProviderKind;
        const name = args?.name;
        if (!PROVIDER_KINDS.includes(kind) || typeof name !== 'string' || !name) {
          return {
            content: [
              {
                type: 'text',
                text: `kind must be one of ${PROVIDER_KINDS.join(', ')} and name is required.`,
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            { type: 'text', text: JSON.stringify(findProviders(registry, kind, name), null, 2) },
          ],
        };
      }

      case 'plan_application': {
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
                text: `Blueprint is not valid:\n${result.errors.map((e) => `  - ${e}`).join('\n')}`,
              },
            ],
            isError: true,
          };
        }
        try {
          await stacksReady;
          const summary = planApplication(result.blueprint, result.resolvedFeatures, stacks);
          return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Planning failed: ${error.message || String(error)}` }],
            isError: true,
          };
        }
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
                  suggestions: result.blueprint?.features
                    ? suggestFeatures(registry, Object.keys(result.blueprint.features))
                    : [],
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
        const runnable = args?.runnable !== false;

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
        await stacksReady;
        const generator = new ApplicationGenerator(outDir, stacks);
        const report = generator.generate(plan, { runnable });
        const writtenPaths = [...report.written, ...report.unchanged];

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
                  conflicts: report.conflicts,
                  orphaned: report.orphaned,
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

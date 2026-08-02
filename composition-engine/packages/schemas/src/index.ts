/* eslint-disable @typescript-eslint/no-explicit-any */
import * as yaml from 'js-yaml';
import { z, ZodError } from 'zod';
import {
  Feature,
  Contract,
  Dependency,
  Blueprint,
  FeatureType,
  FeatureMetadata,
  Module,
} from '@minecode/core';
import { getCoreInfo } from '@minecode/core';

export function getSchemaInfo(): string {
  return `Minecode Schemas relying on: ${getCoreInfo()}`;
}

const featureIdRegex = /^[a-zA-Z0-9-_]+$/;
const semverRegex =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Custom schema validation error containing clear, formatted errors.
 */
export class SchemaValidationError extends Error {
  public readonly errors: string[];

  constructor(message: string, errors: string[]) {
    const fullMessage = `${message}:\n${errors.map((err) => `  - ${err}`).join('\n')}`;
    super(fullMessage);
    this.name = 'SchemaValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, SchemaValidationError.prototype);
  }
}

/**
 * Formats a ZodError into a list of user-friendly string errors.
 */
export function formatZodError(error: ZodError): string[] {
  return error.issues.map((err) => {
    const pathStr = err.path.join('.');
    return pathStr ? `${pathStr}: ${err.message}` : err.message;
  });
}

function safeParseYaml(yamlContent: string): unknown {
  try {
    return yaml.load(yamlContent);
  } catch (error: any) {
    throw new Error(`YAML Syntax Error: ${error.message || error}`);
  }
}

export const RawContractSchema = z.object({
  provides: z
    .object({
      entities: z
        .array(
          z.union([
            z.string().min(1),
            z.object({
              name: z.string().min(1, 'Entity name must be a non-empty string'),
              fields: z
                .array(
                  z.object({
                    name: z.string().min(1),
                    type: z.string().min(1),
                    required: z.boolean().optional(),
                    description: z.string().optional(),
                  })
                )
                .optional(),
              description: z.string().optional(),
            }),
          ])
        )
        .optional(),
      permissions: z
        .array(
          z.union([
            z.string().min(1),
            z.object({
              name: z.string().min(1),
              description: z.string().optional(),
            }),
          ])
        )
        .optional(),
      events: z
        .array(
          z.union([
            z.string().min(1),
            z.object({
              name: z.string().min(1),
              payloadSchema: z.record(z.string(), z.unknown()).optional(),
              description: z.string().optional(),
            }),
          ])
        )
        .optional(),
      extensionPoints: z
        .array(
          z.union([
            z.string().min(1),
            z.object({
              name: z.string().min(1),
              type: z.enum(['function', 'component', 'slot', 'config', 'schema']).optional(),
              description: z.string().optional(),
              schema: z.record(z.string(), z.unknown()).optional(),
            }),
          ])
        )
        .optional(),
      extension_points: z
        .array(
          z.union([
            z.string().min(1),
            z.object({
              name: z.string().min(1),
              type: z.enum(['function', 'component', 'slot', 'config', 'schema']).optional(),
              description: z.string().optional(),
              schema: z.record(z.string(), z.unknown()).optional(),
            }),
          ])
        )
        .optional(),
    })
    .optional(),
  requires: z
    .object({
      features: z.array(z.string()).optional(),
      capabilities: z.array(z.string()).optional(),
    })
    .optional(),
});

export const RawDependencyEntrySchema = z.union([
  z.object({
    featureId: z
      .string()
      .regex(featureIdRegex, 'featureId must be alphanumeric with dashes/underscores'),
    versionRange: z.string().optional(),
    optional: z.boolean().optional(),
  }),
  z.object({
    feature: z.object({
      id: z
        .string()
        .regex(featureIdRegex, 'feature.id must be alphanumeric with dashes/underscores'),
      version: z.string().optional(),
      optional: z.boolean().optional(),
    }),
  }),
]);

export const RawDependenciesSchema = z.union([
  z.array(RawDependencyEntrySchema),
  z.object({
    dependencies: z.array(RawDependencyEntrySchema),
  }),
]);

export const RawFeatureSchema = z.object({
  id: z.string().regex(featureIdRegex, 'id must be alphanumeric with dashes/underscores'),
  version: z.string().refine((val) => semverRegex.test(val), {
    message: 'Version must be a valid SemVer string (e.g. 1.0.0)',
  }),
  type: z.union([
    z.enum(['business', 'infrastructure', 'starter', 'primitive']),
    z.array(z.enum(['business', 'infrastructure', 'starter', 'primitive'])).min(1),
  ]),
  name: z.string().optional(),
  description: z.string().optional(),
  maintainer: z
    .object({
      type: z.enum(['builtin', 'verified', 'company', 'community', 'experimental']),
      name: z.string().optional(),
    })
    .optional(),
  stack: z.array(z.string()).optional(),
  category: z.string().optional(),
  contract: RawContractSchema.optional(),
  dependencies: z.array(RawDependencyEntrySchema).optional(),
  modules: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.enum(['database', 'backend', 'frontend', 'test', 'migration', 'config']),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export const RawBlueprintSchema = z.object({
  application: z.object({
    name: z.string().min(1, 'Application name must be a non-empty string'),
  }),
  stack: z
    .object({
      id: z.string().min(1, 'Stack ID must be a non-empty string'),
    })
    .optional(),
  features: z.record(
    z.string(),
    z.object({
      version: z.string().optional(),
      enabled: z.boolean().optional(),
      config: z.record(z.string(), z.unknown()).optional(),
    })
  ),
});

export function normalizeContract(raw: any): Contract {
  if (!raw) return {};

  const provides: Contract['provides'] = {};
  const requires: Contract['requires'] = {};

  if (raw.provides) {
    if (raw.provides.entities) {
      provides.entities = raw.provides.entities.map((ent: any) => {
        if (typeof ent === 'string') {
          return { name: ent, fields: [], description: '' };
        }
        return {
          name: ent.name,
          fields:
            ent.fields?.map((f: any) => ({
              name: f.name,
              type: f.type,
              required: f.required ?? false,
              description: f.description ?? '',
            })) ?? [],
          description: ent.description ?? '',
        };
      });
    }

    if (raw.provides.permissions) {
      provides.permissions = raw.provides.permissions.map((perm: any) => {
        if (typeof perm === 'string') {
          return { name: perm, description: '' };
        }
        return {
          name: perm.name,
          description: perm.description ?? '',
        };
      });
    }

    if (raw.provides.events) {
      provides.events = raw.provides.events.map((evt: any) => {
        if (typeof evt === 'string') {
          return { name: evt, payloadSchema: {}, description: '' };
        }
        return {
          name: evt.name,
          payloadSchema: evt.payloadSchema ?? {},
          description: evt.description ?? '',
        };
      });
    }

    const extensionPointsRaw = raw.provides.extensionPoints || raw.provides.extension_points;
    if (extensionPointsRaw) {
      provides.extensionPoints = extensionPointsRaw.map((ep: any) => {
        if (typeof ep === 'string') {
          return { name: ep, type: 'function', description: '', schema: {} };
        }
        return {
          name: ep.name,
          type: ep.type ?? 'function',
          description: ep.description ?? '',
          schema: ep.schema ?? {},
        };
      });
    }
  }

  if (raw.requires) {
    if (raw.requires.features) {
      requires.features = raw.requires.features;
    }
    if (raw.requires.capabilities) {
      requires.capabilities = raw.requires.capabilities;
    }
  }

  return { provides, requires };
}

export function normalizeDependencies(raw: any[] | undefined): Dependency[] {
  if (!raw) return [];

  return raw.map((dep: any) => {
    if (dep && typeof dep === 'object' && 'featureId' in dep) {
      return {
        featureId: dep.featureId,
        versionRange: dep.versionRange ?? '*',
        optional: dep.optional ?? false,
      };
    }

    if (dep && typeof dep === 'object' && dep.feature) {
      return {
        featureId: dep.feature.id,
        versionRange: dep.feature.version ?? '*',
        optional: dep.feature.optional ?? false,
      };
    }

    throw new Error('Invalid dependency format');
  });
}

export function normalizeFeature(raw: any): Feature {
  const id = raw.id;
  const version = raw.version;

  let type: FeatureType = 'business';
  if (Array.isArray(raw.type)) {
    type = raw.type[0] as FeatureType;
  } else if (raw.type) {
    type = raw.type as FeatureType;
  }

  const name = raw.name || raw.id;
  const description = raw.description || '';
  const maintainer = raw.maintainer
    ? {
        type: raw.maintainer.type,
        name: raw.maintainer.name || '',
      }
    : undefined;
  const stack = raw.stack || [];
  const category = raw.category || '';

  const metadata: FeatureMetadata = {
    name,
    description,
    maintainer,
    stack,
    category,
  };

  const contract = normalizeContract(raw.contract);
  const dependencies = normalizeDependencies(raw.dependencies);
  const modules: Module[] = (raw.modules || []).map((m: any) => ({
    name: m.name,
    type: m.type,
    description: m.description || '',
  }));

  return {
    id,
    version,
    type,
    metadata,
    contract,
    dependencies,
    modules,
  };
}

export function normalizeBlueprint(raw: any): Blueprint {
  return {
    applicationName: raw.application?.name || '',
    stackId: raw.stack?.id || '',
    features: raw.features || {},
  };
}

export function validateFeature(data: unknown): Feature {
  const result = RawFeatureSchema.safeParse(data);
  if (!result.success) {
    const formattedErrors = formatZodError(result.error);
    throw new SchemaValidationError('Feature validation failed', formattedErrors);
  }
  return normalizeFeature(result.data);
}

export function validateContract(data: unknown): Contract {
  const result = RawContractSchema.safeParse(data);
  if (!result.success) {
    const formattedErrors = formatZodError(result.error);
    throw new SchemaValidationError('Contract validation failed', formattedErrors);
  }
  return normalizeContract(result.data);
}

export function validateDependencies(data: unknown): Dependency[] {
  const result = RawDependenciesSchema.safeParse(data);
  if (!result.success) {
    const formattedErrors = formatZodError(result.error);
    throw new SchemaValidationError('Dependencies validation failed', formattedErrors);
  }

  const rawList = Array.isArray(result.data) ? result.data : result.data.dependencies;
  return normalizeDependencies(rawList);
}

export function validateBlueprint(data: unknown): Blueprint {
  const result = RawBlueprintSchema.safeParse(data);
  if (!result.success) {
    const formattedErrors = formatZodError(result.error);
    throw new SchemaValidationError('Blueprint validation failed', formattedErrors);
  }
  return normalizeBlueprint(result.data);
}

export function parseFeatureYaml(yamlContent: string): Feature {
  const rawObj = safeParseYaml(yamlContent);
  return validateFeature(rawObj);
}

export function parseContractYaml(yamlContent: string): Contract {
  const rawObj = safeParseYaml(yamlContent);
  return validateContract(rawObj);
}

export function parseDependenciesYaml(yamlContent: string): Dependency[] {
  const rawObj = safeParseYaml(yamlContent);
  return validateDependencies(rawObj);
}

export function parseBlueprintYaml(yamlContent: string): Blueprint {
  const rawObj = safeParseYaml(yamlContent);
  return validateBlueprint(rawObj);
}

export function parseYaml(yamlContent: string): unknown {
  return safeParseYaml(yamlContent);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import semver from 'semver';
import { Blueprint, BlueprintValidationResult } from '@minecode/core';
import { FileSystemRegistry, getRegistryInfo } from '@minecode/registry';

export function getResolverInfo(): string {
  return `Minecode Resolver relying on: ${getRegistryInfo()}`;
}

export class BlueprintValidationError extends Error {
  public readonly errors: string[];

  constructor(message: string, errors: string[]) {
    const fullMessage = `${message}:\n${errors.map((err) => `  - ${err}`).join('\n')}`;
    super(fullMessage);
    this.name = 'BlueprintValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, BlueprintValidationError.prototype);
  }
}

/**
 * Validates a feature configuration against a JSON-Schema-like structure.
 */
function validateConfig(
  value: any,
  schema: any,
  path: string,
  featureId: string,
  errors: string[]
): void {
  if (!schema || typeof schema !== 'object') return;

  const type = schema.type;
  if (type) {
    if (type === 'string') {
      if (typeof value !== 'string') {
        errors.push(
          `Feature '${featureId}' config property '${path}' expected type 'string', but got '${typeof value}'.`
        );
        return;
      }
    } else if (type === 'number') {
      if (typeof value !== 'number') {
        errors.push(
          `Feature '${featureId}' config property '${path}' expected type 'number', but got '${typeof value}'.`
        );
        return;
      }
    } else if (type === 'integer') {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        errors.push(
          `Feature '${featureId}' config property '${path}' expected type 'integer', but got '${typeof value}'.`
        );
        return;
      }
    } else if (type === 'boolean') {
      if (typeof value !== 'boolean') {
        errors.push(
          `Feature '${featureId}' config property '${path}' expected type 'boolean', but got '${typeof value}'.`
        );
        return;
      }
    } else if (type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(
          `Feature '${featureId}' config property '${path}' expected type 'array', but got '${typeof value}'.`
        );
        return;
      }
      if (schema.items) {
        value.forEach((item, index) => {
          validateConfig(
            item,
            schema.items,
            path ? `${path}[${index}]` : `[${index}]`,
            featureId,
            errors
          );
        });
      }
    } else if (type === 'object') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push(
          `Feature '${featureId}' config property '${path}' expected type 'object', but got '${typeof value}'.`
        );
        return;
      }
    }
  }

  // Object checks
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    if (Array.isArray(schema.required)) {
      for (const requiredProp of schema.required) {
        if (!(requiredProp in value) || value[requiredProp] === undefined) {
          const propPath = path ? `${path}.${requiredProp}` : requiredProp;
          errors.push(`Feature '${featureId}' config is missing required property '${propPath}'.`);
        }
      }
    }

    if (schema.properties && typeof schema.properties === 'object') {
      for (const [propKey, propSchema] of Object.entries(schema.properties)) {
        if (propKey in value && value[propKey] !== undefined) {
          const propPath = path ? `${path}.${propKey}` : propKey;
          validateConfig(value[propKey], propSchema, propPath, featureId, errors);
        }
      }
    }
  }
}

export class BlueprintValidator {
  private registry: FileSystemRegistry;

  constructor(registry: FileSystemRegistry) {
    this.registry = registry;
  }

  public validate(blueprint: Blueprint): BlueprintValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Determine the stackId to use
    let stackId = blueprint.stackId;
    if (!stackId) {
      stackId = 'nextjs-supabase';
      warnings.push(`Blueprint does not specify a stack. Defaulting to 'nextjs-supabase'.`);
    }

    // Iterate through requested features in the blueprint
    if (blueprint.features) {
      for (const [featureId, featureConfig] of Object.entries(blueprint.features)) {
        // 1. Check if requested feature exists in the registry
        const feature = this.registry.getFeature(featureId);
        if (!feature) {
          errors.push(`Feature '${featureId}' requested in blueprint does not exist in registry.`);
          continue;
        }

        // 2. Check version compatibility
        const requestedRange = featureConfig.version || '*';
        let isCompatible = false;
        try {
          isCompatible = semver.satisfies(feature.version, requestedRange);
        } catch {
          // Fallback if semver fails (e.g., non-standard range tag like 'latest')
          isCompatible = feature.version === requestedRange;
        }

        if (!isCompatible) {
          errors.push(
            `Feature '${featureId}' version '${feature.version}' in registry does not satisfy requested version constraint '${requestedRange}'.`
          );
        }

        // 3. Check configuration against configSchema (if defined)
        if (feature.configSchema) {
          const config = featureConfig.config || {};
          validateConfig(config, feature.configSchema, '', featureId, errors);
        }

        // 4. Check stack compatibility
        if (feature.metadata.stack && feature.metadata.stack.length > 0) {
          const supportsSelectedStack =
            feature.metadata.stack.includes(stackId) || feature.metadata.stack.includes('*');
          if (!supportsSelectedStack) {
            errors.push(
              `Feature '${featureId}' is not compatible with selected stack '${stackId}'. Supported stacks: ${feature.metadata.stack.join(', ')}.`
            );
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export function validateBlueprint(
  blueprint: Blueprint,
  registry: FileSystemRegistry
): BlueprintValidationResult {
  const validator = new BlueprintValidator(registry);
  return validator.validate(blueprint);
}

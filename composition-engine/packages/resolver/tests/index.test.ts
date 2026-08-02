import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { test, expect } from 'vitest';
import { Blueprint } from '@minecode/core';
import { FileSystemRegistry } from '@minecode/registry';
import { getResolverInfo, validateBlueprint, BlueprintValidationError } from '../src/index.js';

test('test_GetResolverInfo_NoArguments_ReturnsResolverInfo', () => {
  const result = getResolverInfo();
  expect(result).toBe(
    'Minecode Resolver relying on: Minecode Registry relying on: Minecode Schemas relying on: Minecode Core version 0.1.0'
  );
});

// Helpers for setting up temporary registries
function createTempRegistryDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-resolver-test-'));
}

function deleteFolderRecursive(directoryPath: string): void {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directoryPath);
  }
}

test('test_ValidateBlueprint_ValidMinimalBlueprint_ReturnsValidResult', () => {
  const tempDir = createTempRegistryDir();
  try {
    const authDir = path.join(tempDir, 'auth');
    fs.mkdirSync(authDir, { recursive: true });
    fs.writeFileSync(
      path.join(authDir, 'feature.yaml'),
      `
id: auth-feature
version: 1.0.0
type: business
name: "Auth"
`
    );

    const registry = new FileSystemRegistry(tempDir);
    registry.load();

    const blueprint: Blueprint = {
      applicationName: 'Test App',
      stackId: 'nextjs-supabase',
      features: {
        'auth-feature': {
          version: '^1.0.0',
          enabled: true,
        },
      },
    };

    const result = validateBlueprint(blueprint, registry);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  } finally {
    deleteFolderRecursive(tempDir);
  }
});

test('test_ValidateBlueprint_MissingFeature_ReturnsValidationError', () => {
  const tempDir = createTempRegistryDir();
  try {
    const registry = new FileSystemRegistry(tempDir);
    registry.load();

    const blueprint: Blueprint = {
      applicationName: 'Test App',
      stackId: 'nextjs-supabase',
      features: {
        'nonexistent-feature': {
          version: '1.0.0',
        },
      },
    };

    const result = validateBlueprint(blueprint, registry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Feature 'nonexistent-feature' requested in blueprint does not exist in registry."
    );
  } finally {
    deleteFolderRecursive(tempDir);
  }
});

test('test_ValidateBlueprint_IncompatibleFeatureVersion_ReturnsValidationError', () => {
  const tempDir = createTempRegistryDir();
  try {
    const authDir = path.join(tempDir, 'auth');
    fs.mkdirSync(authDir, { recursive: true });
    fs.writeFileSync(
      path.join(authDir, 'feature.yaml'),
      `
id: auth-feature
version: 1.0.0
type: business
`
    );

    const registry = new FileSystemRegistry(tempDir);
    registry.load();

    const blueprint: Blueprint = {
      applicationName: 'Test App',
      stackId: 'nextjs-supabase',
      features: {
        'auth-feature': {
          version: '^2.0.0',
        },
      },
    };

    const result = validateBlueprint(blueprint, registry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Feature 'auth-feature' version '1.0.0' in registry does not satisfy requested version constraint '^2.0.0'."
    );
  } finally {
    deleteFolderRecursive(tempDir);
  }
});

test('test_ValidateBlueprint_MissingRequiredConfigProperty_ReturnsValidationError', () => {
  const tempDir = createTempRegistryDir();
  try {
    const billingDir = path.join(tempDir, 'billing');
    fs.mkdirSync(billingDir, { recursive: true });
    fs.writeFileSync(
      path.join(billingDir, 'feature.yaml'),
      `
id: billing-feature
version: 1.5.0
type: business
`
    );
    // Config schema defining required fields
    fs.writeFileSync(
      path.join(billingDir, 'config.schema.yaml'),
      `
type: object
required:
  - provider
  - apiKeys
properties:
  provider:
    type: string
  apiKeys:
    type: object
    required:
      - secret
    properties:
      secret:
        type: string
`
    );

    const registry = new FileSystemRegistry(tempDir);
    registry.load();

    // Blueprint configuration missing 'provider' and nested 'secret'
    const blueprint: Blueprint = {
      applicationName: 'Test App',
      stackId: 'nextjs-supabase',
      features: {
        'billing-feature': {
          version: '1.5.0',
          config: {
            apiKeys: {},
          },
        },
      },
    };

    const result = validateBlueprint(blueprint, registry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Feature 'billing-feature' config is missing required property 'provider'."
    );
    expect(result.errors).toContain(
      "Feature 'billing-feature' config is missing required property 'apiKeys.secret'."
    );
  } finally {
    deleteFolderRecursive(tempDir);
  }
});

test('test_ValidateBlueprint_IncorrectConfigPropertyType_ReturnsValidationError', () => {
  const tempDir = createTempRegistryDir();
  try {
    const dbDir = path.join(tempDir, 'db');
    fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(
      path.join(dbDir, 'feature.yaml'),
      `
id: db-feature
version: 1.0.0
type: infrastructure
`
    );
    fs.writeFileSync(
      path.join(dbDir, 'config.schema.yaml'),
      `
type: object
properties:
  port:
    type: integer
  ssl:
    type: boolean
  url:
    type: string
  options:
    type: object
  allowedHosts:
    type: array
    items:
      type: string
`
    );

    const registry = new FileSystemRegistry(tempDir);
    registry.load();

    // Blueprint supplying incorrect primitive types and array types
    const blueprint: Blueprint = {
      applicationName: 'Test App',
      stackId: 'nextjs-supabase',
      features: {
        'db-feature': {
          config: {
            port: 'not-a-number',
            ssl: 'true-as-string',
            url: 12345,
            options: 'should-be-object',
            allowedHosts: [123, 'valid-host'],
          },
        },
      },
    };

    const result = validateBlueprint(blueprint, registry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Feature 'db-feature' config property 'port' expected type 'integer', but got 'string'."
    );
    expect(result.errors).toContain(
      "Feature 'db-feature' config property 'ssl' expected type 'boolean', but got 'string'."
    );
    expect(result.errors).toContain(
      "Feature 'db-feature' config property 'url' expected type 'string', but got 'number'."
    );
    expect(result.errors).toContain(
      "Feature 'db-feature' config property 'options' expected type 'object', but got 'string'."
    );
    expect(result.errors).toContain(
      "Feature 'db-feature' config property 'allowedHosts[0]' expected type 'string', but got 'number'."
    );
  } finally {
    deleteFolderRecursive(tempDir);
  }
});

test('test_ValidateBlueprint_IncompatibleStackSelected_ReturnsValidationError', () => {
  const tempDir = createTempRegistryDir();
  try {
    const testDir = path.join(tempDir, 'stack-specific');
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(
      path.join(testDir, 'feature.yaml'),
      `
id: specific-feature
version: 1.0.0
type: business
stack:
  - nextjs-supabase
`
    );

    const registry = new FileSystemRegistry(tempDir);
    registry.load();

    // Selected stack is different
    const blueprint: Blueprint = {
      applicationName: 'Test App',
      stackId: 'django-postgres',
      features: {
        'specific-feature': {},
      },
    };

    const result = validateBlueprint(blueprint, registry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Feature 'specific-feature' is not compatible with selected stack 'django-postgres'. Supported stacks: nextjs-supabase."
    );
  } finally {
    deleteFolderRecursive(tempDir);
  }
});

test('test_ValidateBlueprint_DefaultStackAndWarning_ReturnsWarningAndValidatesSelectedStack', () => {
  const tempDir = createTempRegistryDir();
  try {
    const testDir = path.join(tempDir, 'stack-specific');
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(
      path.join(testDir, 'feature.yaml'),
      `
id: specific-feature
version: 1.0.0
type: business
stack:
  - nextjs-supabase
`
    );

    const registry = new FileSystemRegistry(tempDir);
    registry.load();

    // Stack is not specified at all
    const blueprint: Blueprint = {
      applicationName: 'Test App',
      stackId: '',
      features: {
        'specific-feature': {},
      },
    };

    const result = validateBlueprint(blueprint, registry);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "Blueprint does not specify a stack. Defaulting to 'nextjs-supabase'."
    );
  } finally {
    deleteFolderRecursive(tempDir);
  }
});

test('test_BlueprintValidationError_ThrowingError_FormatsActionableErrorMessage', () => {
  const errors = ['Missing foo', 'Invalid bar type'];
  const error = new BlueprintValidationError('Validation failed', errors);

  expect(error.name).toBe('BlueprintValidationError');
  expect(error.errors).toEqual(errors);
  expect(error.message).toContain('Validation failed:');
  expect(error.message).toContain('  - Missing foo');
  expect(error.message).toContain('  - Invalid bar type');
});

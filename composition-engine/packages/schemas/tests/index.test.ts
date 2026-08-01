/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from 'vitest';
import {
  getSchemaInfo,
  parseFeatureYaml,
  parseContractYaml,
  parseDependenciesYaml,
  parseBlueprintYaml,
  SchemaValidationError,
} from '../src/index.js';

test('test_GetSchemaInfo_NoArguments_ReturnsSchemaInfoWithCoreInfo', () => {
  const result = getSchemaInfo();
  expect(result).toBe('Minecode Schemas relying on: Minecode Core version 0.1.0');
});

test('test_ParseFeatureYaml_ValidMinimalInput_ReturnsNormalizedFeature', () => {
  const yamlContent = `
id: my-feature
version: 1.2.3
type: business
  `;
  const result = parseFeatureYaml(yamlContent);
  expect(result.id).toBe('my-feature');
  expect(result.version).toBe('1.2.3');
  expect(result.type).toBe('business');
  expect(result.metadata.name).toBe('my-feature');
  expect(result.metadata.description).toBe('');
  expect(result.contract).toEqual({});
  expect(result.dependencies).toEqual([]);
  expect(result.modules).toEqual([]);
});

test('test_ParseFeatureYaml_TypeAsArray_NormalizesToSingleFeatureType', () => {
  const yamlContent = `
id: my-feature-array
version: 2.0.0-rc.1
type:
  - infrastructure
description: "A cool infra feature"
maintainer:
  type: verified
  name: Minecode Team
  `;
  const result = parseFeatureYaml(yamlContent);
  expect(result.id).toBe('my-feature-array');
  expect(result.version).toBe('2.0.0-rc.1');
  expect(result.type).toBe('infrastructure');
  expect(result.metadata.description).toBe('A cool infra feature');
  expect(result.metadata.maintainer?.type).toBe('verified');
  expect(result.metadata.maintainer?.name).toBe('Minecode Team');
});

test('test_ParseFeatureYaml_FullInlinedFeature_ReturnsFullyParsedAndNormalizedFeature', () => {
  const yamlContent = `
id: auth-full
version: 1.0.0
type: business
name: "User Authentication"
description: "Allows logging in and out"
category: Security
stack:
  - nextjs-supabase
maintainer:
  type: builtin
contract:
  provides:
    entities:
      - name: User
        fields:
          - name: email
            type: string
            required: true
    permissions:
      - user.read
    extension_points:
      - name: custom_login_hook
        type: function
        description: "Runs after successful login"
dependencies:
  - feature:
      id: database
      version: "^1.0"
  - featureId: email-sender
    versionRange: "~2.4.0"
    optional: true
modules:
  - name: auth-lib
    type: backend
    description: "Core authentication library"
  `;
  const result = parseFeatureYaml(yamlContent);
  expect(result.id).toBe('auth-full');
  expect(result.metadata.name).toBe('User Authentication');
  expect(result.metadata.category).toBe('Security');
  expect(result.metadata.stack).toEqual(['nextjs-supabase']);

  expect(result.contract.provides?.entities?.[0].name).toBe('User');
  expect(result.contract.provides?.entities?.[0].fields?.[0].name).toBe('email');
  expect(result.contract.provides?.entities?.[0].fields?.[0].required).toBe(true);
  expect(result.contract.provides?.permissions?.[0].name).toBe('user.read');
  expect(result.contract.provides?.extensionPoints?.[0].name).toBe('custom_login_hook');
  expect(result.contract.provides?.extensionPoints?.[0].type).toBe('function');

  expect(result.dependencies).toHaveLength(2);
  expect(result.dependencies[0]).toEqual({
    featureId: 'database',
    versionRange: '^1.0',
    optional: false,
  });
  expect(result.dependencies[1]).toEqual({
    featureId: 'email-sender',
    versionRange: '~2.4.0',
    optional: true,
  });

  expect(result.modules).toHaveLength(1);
  expect(result.modules[0]).toEqual({
    name: 'auth-lib',
    type: 'backend',
    description: 'Core authentication library',
  });
});

test('test_ParseFeatureYaml_InvalidSemVer_ThrowsSchemaValidationError', () => {
  const yamlContent = `
id: invalid-semver
version: 1.0
type: starter
  `;
  expect(() => parseFeatureYaml(yamlContent)).toThrow(SchemaValidationError);
});

test('test_ParseFeatureYaml_InvalidFeatureId_ThrowsSchemaValidationError', () => {
  const yamlContent = `
id: invalid id spaces
version: 1.0.0
type: primitive
  `;
  expect(() => parseFeatureYaml(yamlContent)).toThrow(SchemaValidationError);
});

test('test_ParseFeatureYaml_MissingRequiredFields_ThrowsSchemaValidationErrorWithDetails', () => {
  const yamlContent = `
id: missing-version
type: business
  `;
  try {
    parseFeatureYaml(yamlContent);
    throw new Error('Expected parseFeatureYaml to throw');
  } catch (err: any) {
    expect(err).toBeInstanceOf(SchemaValidationError);
    expect(err.errors[0]).toContain('version:');
    expect(err.errors[0]).toMatch(/expected string/i);
  }
});

test('test_ParseContractYaml_ValidSimpleInputs_ReturnsNormalizedContract', () => {
  const yamlContent = `
provides:
  entities:
    - User
    - Profile
  permissions:
    - profile.write
  events:
    - profile.updated
  extensionPoints:
    - after_profile_update
requires:
  features:
    - database
  `;
  const result = parseContractYaml(yamlContent);
  expect(result.provides?.entities).toHaveLength(2);
  expect(result.provides?.entities?.[0]).toEqual({
    name: 'User',
    fields: [],
    description: '',
  });
  expect(result.provides?.permissions?.[0]).toEqual({
    name: 'profile.write',
    description: '',
  });
  expect(result.provides?.events?.[0]).toEqual({
    name: 'profile.updated',
    payloadSchema: {},
    description: '',
  });
  expect(result.provides?.extensionPoints?.[0]).toEqual({
    name: 'after_profile_update',
    type: 'function',
    description: '',
    schema: {},
  });
  expect(result.requires?.features).toEqual(['database']);
});

test('test_ParseContractYaml_InvalidFieldTypes_ThrowsSchemaValidationError', () => {
  const yamlContent = `
provides:
  entities:
    - name: 123
      fields: "not an array"
  `;
  expect(() => parseContractYaml(yamlContent)).toThrow(SchemaValidationError);
});

test('test_ParseDependenciesYaml_ValidFlatArray_ReturnsNormalizedDependencies', () => {
  const yamlContent = `
- featureId: db
  versionRange: "^1.0.0"
- featureId: logger
  optional: true
  `;
  const result = parseDependenciesYaml(yamlContent);
  expect(result).toHaveLength(2);
  expect(result[0]).toEqual({
    featureId: 'db',
    versionRange: '^1.0.0',
    optional: false,
  });
  expect(result[1]).toEqual({
    featureId: 'logger',
    versionRange: '*',
    optional: true,
  });
});

test('test_ParseDependenciesYaml_ValidWrappedStructure_ReturnsNormalizedDependencies', () => {
  const yamlContent = `
dependencies:
  - feature:
      id: db-wrapped
      version: ">=2.0"
  `;
  const result = parseDependenciesYaml(yamlContent);
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual({
    featureId: 'db-wrapped',
    versionRange: '>=2.0',
    optional: false,
  });
});

test('test_ParseDependenciesYaml_InvalidDependencies_ThrowsSchemaValidationError', () => {
  const yamlContent = `
- invalidField: true
  `;
  expect(() => parseDependenciesYaml(yamlContent)).toThrow(SchemaValidationError);
});

test('test_ParseBlueprintYaml_ValidAppBlueprint_ReturnsNormalizedBlueprint', () => {
  const yamlContent = `
application:
  name: my-cool-app

stack:
  id: nextjs-supabase

features:
  auth:
    version: "^1.0.0"
    enabled: true
    config:
      provider: oauth
  db: {}
  `;
  const result = parseBlueprintYaml(yamlContent);
  expect(result.applicationName).toBe('my-cool-app');
  expect(result.stackId).toBe('nextjs-supabase');
  expect(result.features.auth).toEqual({
    version: '^1.0.0',
    enabled: true,
    config: { provider: 'oauth' },
  });
  expect(result.features.db).toEqual({});
});

test('test_ParseBlueprintYaml_InvalidBlueprint_ThrowsSchemaValidationError', () => {
  const yamlContent = `
application:
  name: ""
stack:
  id: nextjs-supabase
features: {}
  `;
  expect(() => parseBlueprintYaml(yamlContent)).toThrow(SchemaValidationError);
});

test('test_ParseBlueprintYaml_MalformedYamlSyntax_ThrowsGenericSyntaxError', () => {
  const yamlContent = `
application:
  name: [unclosed bracket
  `;
  expect(() => parseBlueprintYaml(yamlContent)).toThrow(/YAML Syntax Error/);
});

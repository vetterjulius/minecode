import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { test, expect, vi } from 'vitest';
import { getRegistryInfo, FileSystemRegistry, RegistryError } from '../src/index.js';
import { SchemaValidationError } from '@minecode/schemas';

test('test_GetRegistryInfo_NoArguments_ReturnsRegistryInfoWithSchemaInfo', () => {
  const result = getRegistryInfo();
  expect(result).toBe(
    'Minecode Registry relying on: Minecode Schemas relying on: Minecode Core version 0.1.0'
  );
});

// Helper to create temporary directory for testing
function createTempRegistryDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-registry-test-'));
  return tempDir;
}

// Helper to recursively delete directory
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

test('test_FileSystemRegistry_ValidFeatures_LoadsSuccessfullyAndHandlesOperations', () => {
  const tempDir = createTempRegistryDir();
  try {
    // Set up a valid feature folder structure
    const authDir = path.join(tempDir, 'builtin', 'auth');
    const dbDir = path.join(tempDir, 'builtin', 'db');
    fs.mkdirSync(authDir, { recursive: true });
    fs.mkdirSync(dbDir, { recursive: true });

    // auth/feature.yaml (has minimal details)
    fs.writeFileSync(
      path.join(authDir, 'feature.yaml'),
      `
id: auth-feature
version: 1.0.0
type: business
name: "Authentication"
description: "Handles logins"
category: Security
      `
    );

    // auth/contract.yaml
    fs.writeFileSync(
      path.join(authDir, 'contract.yaml'),
      `
provides:
  permissions:
    - name: login.allow
      description: "Allows user to log in"
      `
    );

    // auth/dependencies.yaml
    fs.writeFileSync(
      path.join(authDir, 'dependencies.yaml'),
      `
- featureId: db-feature
  versionRange: "^1.0.0"
      `
    );

    // db/feature.yaml
    fs.writeFileSync(
      path.join(dbDir, 'feature.yaml'),
      `
id: db-feature
version: 2.1.0
type: infrastructure
name: "Database"
description: "Manages tables"
category: Data
      `
    );

    const registry = new FileSystemRegistry(tempDir);
    registry.load();

    // Verify listFeatures
    const features = registry.listFeatures();
    expect(features).toHaveLength(2);

    // Verify hasFeature
    expect(registry.hasFeature('auth-feature')).toBe(true);
    expect(registry.hasFeature('db-feature')).toBe(true);
    expect(registry.hasFeature('nonexistent')).toBe(false);

    // Verify getFeature
    const authFeature = registry.getFeature('auth-feature');
    expect(authFeature).toBeDefined();
    expect(authFeature?.version).toBe('1.0.0');
    expect(authFeature?.metadata.name).toBe('Authentication');

    // Check separate contract.yaml got merged
    expect(authFeature?.contract.provides?.permissions).toBeDefined();
    expect(authFeature?.contract.provides?.permissions?.[0].name).toBe('login.allow');

    // Check separate dependencies.yaml got merged
    expect(authFeature?.dependencies).toHaveLength(1);
    expect(authFeature?.dependencies[0].featureId).toBe('db-feature');

    const dbFeature = registry.getFeature('db-feature');
    expect(dbFeature).toBeDefined();
    expect(dbFeature?.version).toBe('2.1.0');
    expect(dbFeature?.type).toBe('infrastructure');
    expect(dbFeature?.contract).toEqual({});
    expect(dbFeature?.dependencies).toEqual([]);
  } finally {
    deleteFolderRecursive(tempDir);
  }
});

test('test_FileSystemRegistry_NonexistentRootDirectory_ReturnsEmptyList', () => {
  const registry = new FileSystemRegistry('non-existent-directory-path-at-all');
  registry.load();
  expect(registry.listFeatures()).toHaveLength(0);
});

test('test_FileSystemRegistry_FilePassedAsRootDirectory_ReturnsEmptyList', () => {
  const tempDir = createTempRegistryDir();
  try {
    const filePath = path.join(tempDir, 'some-file.txt');
    fs.writeFileSync(filePath, 'hello');

    const registry = new FileSystemRegistry(filePath);
    registry.load();
    expect(registry.listFeatures()).toHaveLength(0);
  } finally {
    deleteFolderRecursive(tempDir);
  }
});

test('test_FileSystemRegistry_DotDirectoriesAndNodeModules_AreSkipped', () => {
  const tempDir = createTempRegistryDir();
  try {
    const nodeModulesDir = path.join(tempDir, 'node_modules');
    const dotDir = path.join(tempDir, '.git');
    fs.mkdirSync(nodeModulesDir, { recursive: true });
    fs.mkdirSync(dotDir, { recursive: true });

    // Put a feature in both to see if they are traversed
    fs.writeFileSync(
      path.join(nodeModulesDir, 'feature.yaml'),
      `
id: ignored-node-modules
version: 1.0.0
type: business
      `
    );
    fs.writeFileSync(
      path.join(dotDir, 'feature.yaml'),
      `
id: ignored-dot-dir
version: 1.0.0
type: business
      `
    );

    const registry = new FileSystemRegistry(tempDir);
    registry.load();
    expect(registry.listFeatures()).toHaveLength(0);
  } finally {
    deleteFolderRecursive(tempDir);
  }
});

test('test_FileSystemRegistry_InvalidFeatureYaml_ThrowsSchemaValidationError', () => {
  const tempDir = createTempRegistryDir();
  try {
    const invalidDir = path.join(tempDir, 'invalid-feat');
    fs.mkdirSync(invalidDir, { recursive: true });

    // feature.yaml missing required field 'version'
    fs.writeFileSync(
      path.join(invalidDir, 'feature.yaml'),
      `
id: invalid-feature
type: business
      `
    );

    const registry = new FileSystemRegistry(tempDir);
    expect(() => registry.load()).toThrow(SchemaValidationError);
  } finally {
    deleteFolderRecursive(tempDir);
  }
});

test('test_FileSystemRegistry_DuplicateFeatureId_ThrowsRegistryError', () => {
  const tempDir = createTempRegistryDir();
  try {
    const featDir1 = path.join(tempDir, 'builtin', 'auth');
    const featDir2 = path.join(tempDir, 'experimental', 'auth');
    fs.mkdirSync(featDir1, { recursive: true });
    fs.mkdirSync(featDir2, { recursive: true });

    fs.writeFileSync(
      path.join(featDir1, 'feature.yaml'),
      `
id: auth-feature
version: 1.0.0
type: business
      `
    );

    fs.writeFileSync(
      path.join(featDir2, 'feature.yaml'),
      `
id: auth-feature
version: 2.0.0
type: business
      `
    );

    const registry = new FileSystemRegistry(tempDir);
    expect(() => registry.load()).toThrow(RegistryError);
    expect(() => registry.load()).toThrow(/Duplicate feature ID found/);
  } finally {
    deleteFolderRecursive(tempDir);
  }
});

test('test_FileSystemRegistry_InlinedAndSeparateWarnings_PrintsConsoleWarning', () => {
  const tempDir = createTempRegistryDir();
  try {
    const featDir = path.join(tempDir, 'warn-feat');
    fs.mkdirSync(featDir, { recursive: true });

    fs.writeFileSync(
      path.join(featDir, 'feature.yaml'),
      `
id: warn-feature
version: 1.0.0
type: business
contract:
  provides:
    permissions:
      - perm.inlined
dependencies:
  - featureId: dep-inlined
    versionRange: "1.0.0"
      `
    );

    fs.writeFileSync(
      path.join(featDir, 'contract.yaml'),
      `
provides:
  permissions:
    - perm.separate
      `
    );

    fs.writeFileSync(
      path.join(featDir, 'dependencies.yaml'),
      `
- featureId: dep-separate
  versionRange: "2.0.0"
      `
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const registry = new FileSystemRegistry(tempDir);
    registry.load();

    expect(warnSpy).toHaveBeenCalled();

    const loaded = registry.getFeature('warn-feature');
    expect(loaded).toBeDefined();
    // Separate files should have overridden the inlined fields
    expect(loaded?.contract.provides?.permissions?.[0]).toEqual({
      name: 'perm.separate',
      description: '',
    });
    expect(loaded?.dependencies?.[0].featureId).toBe('dep-separate');

    warnSpy.mockRestore();
  } finally {
    deleteFolderRecursive(tempDir);
  }
});

test('test_FileSystemRegistry_SearchFeatures_ReturnsCorrectFilteredFeatures', () => {
  const tempDir = createTempRegistryDir();
  try {
    const authDir = path.join(tempDir, 'auth');
    const paymentDir = path.join(tempDir, 'payment');
    fs.mkdirSync(authDir, { recursive: true });
    fs.mkdirSync(paymentDir, { recursive: true });

    fs.writeFileSync(
      path.join(authDir, 'feature.yaml'),
      `
id: auth-feature
version: 1.0.0
type: business
name: "Authentication Component"
description: "Provides basic email login"
category: Security
      `
    );

    fs.writeFileSync(
      path.join(paymentDir, 'feature.yaml'),
      `
id: stripe-payment
version: 1.0.0
type: business
name: "Stripe Billing"
description: "Integrates standard payments"
category: Finance
      `
    );

    const registry = new FileSystemRegistry(tempDir);
    registry.load();

    // Query match on ID (exact and partial)
    let results = registry.searchFeatures('auth');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('auth-feature');

    // Query match on ID case-insensitively
    results = registry.searchFeatures('STRIPE');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('stripe-payment');

    // Query match on description partial
    results = registry.searchFeatures('basic email');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('auth-feature');

    // Query match on category
    results = registry.searchFeatures('finance');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('stripe-payment');

    // Empty query returns all
    results = registry.searchFeatures('');
    expect(results).toHaveLength(2);

    // Non-matching query returns none
    results = registry.searchFeatures('nonexistent');
    expect(results).toHaveLength(0);
  } finally {
    deleteFolderRecursive(tempDir);
  }
});

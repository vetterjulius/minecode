import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { Blueprint } from '@minecode/core';
import { FileSystemRegistry } from '@minecode/registry';
import {
  FeatureDependencyResolver,
  DependencyResolutionError,
  CircularDependencyError,
} from '../src/index.js';

// Helpers for setting up temporary registries
function createTempRegistryDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-dependency-test-'));
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

let tempDir: string;

beforeEach(() => {
  tempDir = createTempRegistryDir();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  deleteFolderRecursive(tempDir);
  vi.restoreAllMocks();
});

test('test_Resolve_SimpleChain_ReturnsTopologicallySortedFeatures', () => {
  // Setup standard chain: Billing -> Organizations -> Authentication
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

  const orgsDir = path.join(tempDir, 'orgs');
  fs.mkdirSync(orgsDir, { recursive: true });
  fs.writeFileSync(
    path.join(orgsDir, 'feature.yaml'),
    `
id: orgs-feature
version: 1.1.0
type: business
name: "Orgs"
`
  );
  fs.writeFileSync(
    path.join(orgsDir, 'dependencies.yaml'),
    `
- featureId: auth-feature
  versionRange: "^1.0.0"
`
  );

  const billingDir = path.join(tempDir, 'billing');
  fs.mkdirSync(billingDir, { recursive: true });
  fs.writeFileSync(
    path.join(billingDir, 'feature.yaml'),
    `
id: billing-feature
version: 2.0.0
type: business
name: "Billing"
`
  );
  fs.writeFileSync(
    path.join(billingDir, 'dependencies.yaml'),
    `
- featureId: orgs-feature
  versionRange: "^1.0.0"
`
  );

  const registry = new FileSystemRegistry(tempDir);
  registry.load();

  const resolver = new FeatureDependencyResolver(registry);

  const blueprint: Blueprint = {
    applicationName: 'Test App',
    stackId: 'nextjs-supabase',
    features: {
      'billing-feature': {},
    },
  };

  const resolved = resolver.resolve(blueprint);
  expect(resolved).toHaveLength(3);
  expect(resolved[0].id).toBe('auth-feature');
  expect(resolved[1].id).toBe('orgs-feature');
  expect(resolved[2].id).toBe('billing-feature');
});

test('test_Resolve_MultipleBranches_ReturnsDeterministicOrder', () => {
  // Setup multi-branch tree:
  // - A depends on B and C
  // - B depends on D
  // - C depends on D
  const dDir = path.join(tempDir, 'd');
  fs.mkdirSync(dDir, { recursive: true });
  fs.writeFileSync(
    path.join(dDir, 'feature.yaml'),
    `
id: feature-d
version: 1.0.0
type: business
`
  );

  const bDir = path.join(tempDir, 'b');
  fs.mkdirSync(bDir, { recursive: true });
  fs.writeFileSync(
    path.join(bDir, 'feature.yaml'),
    `
id: feature-b
version: 1.0.0
type: business
`
  );
  fs.writeFileSync(
    path.join(bDir, 'dependencies.yaml'),
    `
- featureId: feature-d
  versionRange: "*"
`
  );

  const cDir = path.join(tempDir, 'c');
  fs.mkdirSync(cDir, { recursive: true });
  fs.writeFileSync(
    path.join(cDir, 'feature.yaml'),
    `
id: feature-c
version: 1.0.0
type: business
`
  );
  fs.writeFileSync(
    path.join(cDir, 'dependencies.yaml'),
    `
- featureId: feature-d
  versionRange: "*"
`
  );

  const aDir = path.join(tempDir, 'a');
  fs.mkdirSync(aDir, { recursive: true });
  fs.writeFileSync(
    path.join(aDir, 'feature.yaml'),
    `
id: feature-a
version: 1.0.0
type: business
`
  );
  fs.writeFileSync(
    path.join(aDir, 'dependencies.yaml'),
    `
- featureId: feature-b
  versionRange: "*"
- featureId: feature-c
  versionRange: "*"
`
  );

  const registry = new FileSystemRegistry(tempDir);
  registry.load();

  const resolver = new FeatureDependencyResolver(registry);

  const blueprint: Blueprint = {
    applicationName: 'Test App',
    stackId: 'nextjs-supabase',
    features: {
      'feature-a': {},
    },
  };

  const resolved = resolver.resolve(blueprint);
  expect(resolved).toHaveLength(4);

  // Topological sorting ensures dependencies come before consumers
  const indices = new Map<string, number>();
  resolved.forEach((f, index) => indices.set(f.id, index));

  expect(indices.get('feature-d')).toBeLessThan(indices.get('feature-b')!);
  expect(indices.get('feature-d')).toBeLessThan(indices.get('feature-c')!);
  expect(indices.get('feature-b')).toBeLessThan(indices.get('feature-a')!);
  expect(indices.get('feature-c')).toBeLessThan(indices.get('feature-a')!);

  // No duplicate features should exist
  const uniqueIds = new Set(resolved.map((f) => f.id));
  expect(uniqueIds.size).toBe(4);
});

test('test_Resolve_DisabledFeature_IsIgnored', () => {
  const bDir = path.join(tempDir, 'b');
  fs.mkdirSync(bDir, { recursive: true });
  fs.writeFileSync(
    path.join(bDir, 'feature.yaml'),
    `
id: feature-b
version: 1.0.0
type: business
`
  );

  const aDir = path.join(tempDir, 'a');
  fs.mkdirSync(aDir, { recursive: true });
  fs.writeFileSync(
    path.join(aDir, 'feature.yaml'),
    `
id: feature-a
version: 1.0.0
type: business
`
  );

  const registry = new FileSystemRegistry(tempDir);
  registry.load();

  const resolver = new FeatureDependencyResolver(registry);

  const blueprint: Blueprint = {
    applicationName: 'Test App',
    stackId: 'nextjs-supabase',
    features: {
      'feature-a': { enabled: true },
      'feature-b': { enabled: false },
    },
  };

  const resolved = resolver.resolve(blueprint);
  expect(resolved).toHaveLength(1);
  expect(resolved[0].id).toBe('feature-a');
});

test('test_Resolve_MissingRequiredDependency_ThrowsDependencyResolutionError', () => {
  const aDir = path.join(tempDir, 'a');
  fs.mkdirSync(aDir, { recursive: true });
  fs.writeFileSync(
    path.join(aDir, 'feature.yaml'),
    `
id: feature-a
version: 1.0.0
type: business
`
  );
  fs.writeFileSync(
    path.join(aDir, 'dependencies.yaml'),
    `
- featureId: missing-feature
  versionRange: "*"
`
  );

  const registry = new FileSystemRegistry(tempDir);
  registry.load();

  const resolver = new FeatureDependencyResolver(registry);

  const blueprint: Blueprint = {
    applicationName: 'Test App',
    stackId: 'nextjs-supabase',
    features: {
      'feature-a': {},
    },
  };

  expect(() => resolver.resolve(blueprint)).toThrow(DependencyResolutionError);
  expect(() => resolver.resolve(blueprint)).toThrow(
    "Feature 'missing-feature' (required by 'feature-a') was not found in the registry."
  );
});

test('test_Resolve_IncompatibleRequiredDependency_ThrowsDependencyResolutionError', () => {
  const bDir = path.join(tempDir, 'b');
  fs.mkdirSync(bDir, { recursive: true });
  fs.writeFileSync(
    path.join(bDir, 'feature.yaml'),
    `
id: feature-b
version: 1.0.0
type: business
`
  );

  const aDir = path.join(tempDir, 'a');
  fs.mkdirSync(aDir, { recursive: true });
  fs.writeFileSync(
    path.join(aDir, 'feature.yaml'),
    `
id: feature-a
version: 1.0.0
type: business
`
  );
  fs.writeFileSync(
    path.join(aDir, 'dependencies.yaml'),
    `
- featureId: feature-b
  versionRange: "^2.0.0"
`
  );

  const registry = new FileSystemRegistry(tempDir);
  registry.load();

  const resolver = new FeatureDependencyResolver(registry);

  const blueprint: Blueprint = {
    applicationName: 'Test App',
    stackId: 'nextjs-supabase',
    features: {
      'feature-a': {},
    },
  };

  expect(() => resolver.resolve(blueprint)).toThrow(DependencyResolutionError);
  expect(() => resolver.resolve(blueprint)).toThrow(
    "Feature 'feature-b' version '1.0.0' in registry does not satisfy requested version constraint '^2.0.0' requested by 'feature-a'."
  );
});

test('test_Resolve_MissingOptionalDependency_SkipsAndWarns', () => {
  const aDir = path.join(tempDir, 'a');
  fs.mkdirSync(aDir, { recursive: true });
  fs.writeFileSync(
    path.join(aDir, 'feature.yaml'),
    `
id: feature-a
version: 1.0.0
type: business
`
  );
  fs.writeFileSync(
    path.join(aDir, 'dependencies.yaml'),
    `
- featureId: missing-optional-feature
  versionRange: "*"
  optional: true
`
  );

  const registry = new FileSystemRegistry(tempDir);
  registry.load();

  const resolver = new FeatureDependencyResolver(registry);

  const blueprint: Blueprint = {
    applicationName: 'Test App',
    stackId: 'nextjs-supabase',
    features: {
      'feature-a': {},
    },
  };

  const resolved = resolver.resolve(blueprint);
  expect(resolved).toHaveLength(1);
  expect(resolved[0].id).toBe('feature-a');
  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining(
      "[WARNING] Optional dependency 'missing-optional-feature' requested by 'feature-a' is not available in the registry. Skipping."
    )
  );
});

test('test_Resolve_IncompatibleOptionalDependency_SkipsAndWarns', () => {
  const bDir = path.join(tempDir, 'b');
  fs.mkdirSync(bDir, { recursive: true });
  fs.writeFileSync(
    path.join(bDir, 'feature.yaml'),
    `
id: feature-b
version: 1.0.0
type: business
`
  );

  const aDir = path.join(tempDir, 'a');
  fs.mkdirSync(aDir, { recursive: true });
  fs.writeFileSync(
    path.join(aDir, 'feature.yaml'),
    `
id: feature-a
version: 1.0.0
type: business
`
  );
  fs.writeFileSync(
    path.join(aDir, 'dependencies.yaml'),
    `
- featureId: feature-b
  versionRange: "^2.0.0"
  optional: true
`
  );

  const registry = new FileSystemRegistry(tempDir);
  registry.load();

  const resolver = new FeatureDependencyResolver(registry);

  const blueprint: Blueprint = {
    applicationName: 'Test App',
    stackId: 'nextjs-supabase',
    features: {
      'feature-a': {},
    },
  };

  const resolved = resolver.resolve(blueprint);
  expect(resolved).toHaveLength(1);
  expect(resolved[0].id).toBe('feature-a');
  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining(
      "[WARNING] Optional dependency 'feature-b' version '1.0.0' does not satisfy constraint '^2.0.0' of feature 'feature-a'. Skipping."
    )
  );
});

test('test_Resolve_CircularDependency_ThrowsCircularDependencyError', () => {
  // Setup cycle: A -> B -> C -> A
  const cDir = path.join(tempDir, 'c');
  fs.mkdirSync(cDir, { recursive: true });
  fs.writeFileSync(
    path.join(cDir, 'feature.yaml'),
    `
id: feature-c
version: 1.0.0
type: business
`
  );
  fs.writeFileSync(
    path.join(cDir, 'dependencies.yaml'),
    `
- featureId: feature-a
  versionRange: "*"
`
  );

  const bDir = path.join(tempDir, 'b');
  fs.mkdirSync(bDir, { recursive: true });
  fs.writeFileSync(
    path.join(bDir, 'feature.yaml'),
    `
id: feature-b
version: 1.0.0
type: business
`
  );
  fs.writeFileSync(
    path.join(bDir, 'dependencies.yaml'),
    `
- featureId: feature-c
  versionRange: "*"
`
  );

  const aDir = path.join(tempDir, 'a');
  fs.mkdirSync(aDir, { recursive: true });
  fs.writeFileSync(
    path.join(aDir, 'feature.yaml'),
    `
id: feature-a
version: 1.0.0
type: business
`
  );
  fs.writeFileSync(
    path.join(aDir, 'dependencies.yaml'),
    `
- featureId: feature-b
  versionRange: "*"
`
  );

  const registry = new FileSystemRegistry(tempDir);
  registry.load();

  const resolver = new FeatureDependencyResolver(registry);

  const blueprint: Blueprint = {
    applicationName: 'Test App',
    stackId: 'nextjs-supabase',
    features: {
      'feature-a': {},
    },
  };

  expect(() => resolver.resolve(blueprint)).toThrow(CircularDependencyError);
  try {
    resolver.resolve(blueprint);
  } catch (error: unknown) {
    const err = error as CircularDependencyError;
    expect(err).toBeInstanceOf(CircularDependencyError);
    expect(err.cyclePath).toEqual(['feature-a', 'feature-b', 'feature-c', 'feature-a']);
    expect(err.message).toContain(
      'Circular dependency detected: feature-a -> feature-b -> feature-c -> feature-a'
    );
  }
});

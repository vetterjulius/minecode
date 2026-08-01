import { test, expect, describe } from 'vitest';
import {
  validatePackageDependencies,
  validateFileImports,
  ProjectInfo,
} from '../src/boundary-validator.js';

describe('validatePackageDependencies', () => {
  test('test_ValidatePackageDependencies_ValidLowerLayerDependencies_NoErrorsReturned', () => {
    const projects: Record<string, ProjectInfo> = {
      '@minecode/core': {
        name: '@minecode/core',
        dependencies: {},
      },
      '@minecode/schemas': {
        name: '@minecode/schemas',
        dependencies: {
          '@minecode/core': 'workspace:*',
        },
      },
    };

    const result = validatePackageDependencies(projects);
    expect(result).toHaveLength(0);
  });

  test('test_ValidatePackageDependencies_InvalidHigherLayerDependency_ReturnsValidationError', () => {
    const projects: Record<string, ProjectInfo> = {
      '@minecode/core': {
        name: '@minecode/core',
        dependencies: {
          '@minecode/schemas': 'workspace:*', // Invalid: core depending on schemas
        },
      },
      '@minecode/schemas': {
        name: '@minecode/schemas',
        dependencies: {},
      },
    };

    const result = validatePackageDependencies(projects);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('boundary');
    expect(result[0].project).toBe('@minecode/core');
    expect(result[0].message).toContain('is not allowed to depend on');
  });

  test('test_ValidatePackageDependencies_AppDependingOnAnotherApp_ReturnsValidationError', () => {
    const projects: Record<string, ProjectInfo> = {
      '@minecode/cli': {
        name: '@minecode/cli',
        dependencies: {
          '@minecode/mcp-server': 'workspace:*', // Invalid: App depending on App
        },
      },
      '@minecode/mcp-server': {
        name: '@minecode/mcp-server',
        dependencies: {},
      },
    };

    const result = validatePackageDependencies(projects);
    expect(result).toHaveLength(1);
    expect(result[0].project).toBe('@minecode/cli');
    expect(result[0].message).toContain('is not allowed to depend on another app');
  });

  test('test_ValidatePackageDependencies_LibraryDependingOnApp_ReturnsValidationError', () => {
    const projects: Record<string, ProjectInfo> = {
      '@minecode/generator': {
        name: '@minecode/generator',
        dependencies: {
          '@minecode/cli': 'workspace:*', // Invalid: generator depending on CLI
        },
      },
      '@minecode/cli': {
        name: '@minecode/cli',
        dependencies: {},
      },
    };

    const result = validatePackageDependencies(projects);
    expect(result).toHaveLength(1);
    expect(result[0].project).toBe('@minecode/generator');
    expect(result[0].message).toContain('is not allowed to depend on app');
  });

  test('test_ValidatePackageDependencies_PackageDependingOnUnknownMonorepoPackage_ReturnsValidationError', () => {
    const projects: Record<string, ProjectInfo> = {
      '@minecode/schemas': {
        name: '@minecode/schemas',
        dependencies: {
          '@minecode/nonexistent': 'workspace:*',
        },
      },
    };

    const result = validatePackageDependencies(projects);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('boundary');
    expect(result[0].project).toBe('@minecode/schemas');
    expect(result[0].message).toContain("depends on an unknown monorepo package '@minecode/nonexistent'");
  });
});

describe('validateFileImports', () => {
  test('test_ValidateFileImports_DeclaredMinecodeDependencyImported_NoErrorsReturned', () => {
    const fileContent = `import { getCoreInfo } from '@minecode/core';`;
    const result = validateFileImports(
      '@minecode/schemas',
      'composition-engine/packages/schemas/src/index.ts',
      fileContent,
      'composition-engine/packages/schemas',
      ['@minecode/core']
    );
    expect(result).toHaveLength(0);
  });

  test('test_ValidateFileImports_UndeclaredMinecodeDependencyImported_ReturnsImportError', () => {
    const fileContent = `import { getRegistryInfo } from '@minecode/registry';`;
    const result = validateFileImports(
      '@minecode/schemas',
      'composition-engine/packages/schemas/src/index.ts',
      fileContent,
      'composition-engine/packages/schemas',
      ['@minecode/core'] // Undeclared: @minecode/registry
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('import');
    expect(result[0].project).toBe('@minecode/schemas');
    expect(result[0].message).toContain('is not declared as a dependency');
  });

  test('test_ValidateFileImports_RelativeImportEscapingBoundary_ReturnsRelativeEscapeError', () => {
    const fileContent = `import { something } from '../../core/src/index.js';`;
    const result = validateFileImports(
      '@minecode/schemas',
      'composition-engine/packages/schemas/src/index.ts',
      fileContent,
      'composition-engine/packages/schemas',
      ['@minecode/core']
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('relative-escape');
    expect(result[0].project).toBe('@minecode/schemas');
    expect(result[0].file).toBe('composition-engine/packages/schemas/src/index.ts');
    expect(result[0].message).toContain('escapes the package boundary');
  });
});

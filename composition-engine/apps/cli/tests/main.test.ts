import { test, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  runCLI,
  runInitCommand,
  runValidateCommand,
  runBuildCommand,
  runFeatureListCommand,
  runFeatureInspectCommand,
  runFeatureCreateCommand,
  runFeatureValidateSpecificCommand,
  runFeatureRegisterSubgeneratorsCommand,
} from '../src/main.js';

test('test_RunCLI_NoArguments_ReturnsCLIInfoAndLogs', () => {
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const result = runCLI();
  expect(result).toContain('Minecode CLI initialised.');
  expect(consoleSpy).toHaveBeenCalledWith(result);
  consoleSpy.mockRestore();
});

function createTempTestEnv(): { tempDir: string; registryDir: string; blueprintPath: string } {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-cli-test-'));
  const registryDir = path.join(tempDir, 'features');
  fs.mkdirSync(registryDir, { recursive: true });

  // Create a dummy feature
  const featDir = path.join(registryDir, 'builtin', 'auth');
  fs.mkdirSync(featDir, { recursive: true });
  fs.writeFileSync(
    path.join(featDir, 'feature.yaml'),
    `
id: auth-feature
version: 1.0.0
type: business
name: "Authentication"
description: "Handles logins"
category: Security
`
  );

  const blueprintPath = path.join(tempDir, 'app.yaml');
  fs.writeFileSync(
    blueprintPath,
    `
application:
  name: "My CLI App"
stack:
  id: "nextjs-supabase"
features:
  auth-feature:
    version: "^1.0.0"
`
  );

  return { tempDir, registryDir, blueprintPath };
}

test('test_RunInitCommand_NoExistingBlueprint_CreatesAppYaml', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-cli-init-'));
  const origCwd = process.cwd();
  process.chdir(tempDir);

  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  try {
    runInitCommand();
    const createdPath = path.join(tempDir, 'app.yaml');
    expect(fs.existsSync(createdPath)).toBe(true);
    const content = fs.readFileSync(createdPath, 'utf8');
    expect(content).toContain('Minecode Application Blueprint');
    expect(logSpy).toHaveBeenCalled();
  } finally {
    process.chdir(origCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    logSpy.mockRestore();
  }
});

test('test_RunInitCommand_ExistingBlueprint_AbortsAndExits', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-cli-init-err-'));
  const origCwd = process.cwd();
  process.chdir(tempDir);

  const appYamlPath = path.join(tempDir, 'app.yaml');
  fs.writeFileSync(appYamlPath, 'existing content', 'utf8');

  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

  try {
    runInitCommand();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();
  } finally {
    process.chdir(origCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  }
});

test('test_RunValidateCommand_ValidBlueprint_ReturnsSuccess', () => {
  const { tempDir, registryDir, blueprintPath } = createTempTestEnv();

  try {
    const result = runValidateCommand(blueprintPath, { features: registryDir });
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('test_RunFeatureRegisterSubgeneratorsCommand_LocalGenerator_CopiesAndRegistersSuccessfully', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-cli-reg-sub-'));
  const localSubGensDir = path.join(tempDir, 'sub-generators');
  fs.mkdirSync(localSubGensDir, { recursive: true });

  const dummySubGenContent = `
import { SubGenerator, CompositionPlan } from '@minecode/core';
export class DummySubGenerator implements SubGenerator {
  public readonly id = 'dummy';
  public generate(_plan: CompositionPlan) {
    return { 'generated/dummy.txt': 'hello' };
  }
}
`;
  fs.writeFileSync(path.join(localSubGensDir, 'dummy.ts'), dummySubGenContent, 'utf8');

  // We need feature.yaml to locate it
  fs.writeFileSync(
    path.join(tempDir, 'feature.yaml'),
    'id: dummy-feature\nversion: 1.0.0\ntype: business',
    'utf8'
  );

  const globalGeneratorsDir = path.resolve(
    process.cwd(),
    'composition-engine/packages/sub-generators/src/generators'
  );

  // Backup existing registry and index files
  const registryPath = path.join(path.dirname(globalGeneratorsDir), 'registry.ts');
  const indexPath = path.join(path.dirname(globalGeneratorsDir), 'index.ts');
  const registryBackup = fs.readFileSync(registryPath, 'utf8');
  const indexBackup = fs.readFileSync(indexPath, 'utf8');

  try {
    const result = await runFeatureRegisterSubgeneratorsCommand(tempDir);
    expect(result.success).toBe(true);

    // Verify file copied
    const copiedPath = path.join(globalGeneratorsDir, 'dummy.ts');
    expect(fs.existsSync(copiedPath)).toBe(true);

    // Verify registry updated
    const updatedRegistry = fs.readFileSync(registryPath, 'utf8');
    expect(updatedRegistry).toContain('DummySubGenerator');
    expect(updatedRegistry).toContain("import { DummySubGenerator } from './generators/dummy.js';");
  } finally {
    // Cleanup copied file and restore backup
    const copiedPath = path.join(globalGeneratorsDir, 'dummy.ts');
    if (fs.existsSync(copiedPath)) {
      fs.unlinkSync(copiedPath);
    }
    fs.writeFileSync(registryPath, registryBackup, 'utf8');
    fs.writeFileSync(indexPath, indexBackup, 'utf8');
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('test_RunBuildCommand_WithNoRunnableOption_DoesNotGenerateConfigsAndPage', () => {
  const { tempDir, registryDir, blueprintPath } = createTempTestEnv();
  const outDir = path.join(tempDir, 'app');

  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  try {
    const result = runBuildCommand(blueprintPath, {
      features: registryDir,
      outDir,
      runnable: false,
    });
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'package.json'))).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'tsconfig.json'))).toBe(false);
    expect(fs.existsSync(path.join(outDir, 'app/page.tsx'))).toBe(false);
  } finally {
    logSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('test_RunFeatureCreateCommand_WithArguments_CreatesStructure', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-cli-create-'));
  try {
    const result = await runFeatureCreateCommand('test-feat', {
      name: 'Test Feature',
      features: tempDir,
    });
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);

    const createdDir = result.targetDir!;
    expect(fs.existsSync(path.join(createdDir, 'feature.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(createdDir, 'contract.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(createdDir, 'config.schema.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(createdDir, 'dependencies.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(createdDir, 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(createdDir, 'tests', 'index.test.ts'))).toBe(true);

    const featureContent = fs.readFileSync(path.join(createdDir, 'feature.yaml'), 'utf8');
    expect(featureContent).toContain('id: test-feat');
    expect(featureContent).toContain('name: "Test Feature"');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('test_RunFeatureCreateCommand_InvalidId_ReturnsError', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-cli-create-err-'));
  try {
    const result = await runFeatureCreateCommand('invalid id!', {
      name: 'Test Feature',
      features: tempDir,
    });
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Invalid Feature ID');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('test_RunFeatureValidateSpecificCommand_ValidFeature_Succeeds', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-cli-val-'));
  try {
    const createResult = await runFeatureCreateCommand('valid-feat', {
      name: 'Valid Feature',
      features: tempDir,
    });
    expect(createResult.success).toBe(true);

    const valResult = runFeatureValidateSpecificCommand(createResult.targetDir!, {
      features: tempDir,
    });
    expect(valResult.success).toBe(true);
    expect(valResult.errors).toHaveLength(0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('test_RunFeatureValidateSpecificCommand_InvalidFeature_ReturnsErrors', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-cli-val-err-'));
  try {
    const createResult = await runFeatureCreateCommand('invalid-feat', {
      name: 'Invalid Feature',
      features: tempDir,
    });
    expect(createResult.success).toBe(true);

    // Overwrite with invalid type and version
    fs.writeFileSync(
      path.join(createResult.targetDir!, 'feature.yaml'),
      `id: invalid-feat\nversion: invalid_semver\ntype: bad_type`
    );

    const valResult = runFeatureValidateSpecificCommand(createResult.targetDir!, {
      features: tempDir,
    });
    expect(valResult.success).toBe(false);
    expect(valResult.errors.length).toBeGreaterThan(0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('test_RunFeatureValidateSpecificCommand_NonexistentPath_ReturnsError', () => {
  const result = runFeatureValidateSpecificCommand('/nonexistent/path/to/feature');
  expect(result.success).toBe(false);
  expect(result.errors.length).toBeGreaterThan(0);
});

test('test_RunValidateCommand_InvalidBlueprint_ReturnsErrors', () => {
  const { tempDir, registryDir, blueprintPath } = createTempTestEnv();
  // Overwrite blueprint to request nonexistent feature
  fs.writeFileSync(
    blueprintPath,
    `
application:
  name: "Invalid App"
features:
  nonexistent-feature:
    version: "1.0.0"
`
  );

  try {
    const result = runValidateCommand(blueprintPath, { features: registryDir });
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('nonexistent-feature');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('test_RunBuildCommand_ValidBlueprint_GeneratesFiles', () => {
  const { tempDir, registryDir, blueprintPath } = createTempTestEnv();
  const outDir = path.join(tempDir, 'app');

  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  try {
    const result = runBuildCommand(blueprintPath, { features: registryDir, outDir });
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'config'))).toBe(true);
  } finally {
    logSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('test_RunFeatureListCommand_ValidRegistry_PrintsTable', () => {
  const { tempDir, registryDir } = createTempTestEnv();
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  try {
    const result = runFeatureListCommand({ features: registryDir });
    expect(result.success).toBe(true);
    expect(logSpy).toHaveBeenCalled();
  } finally {
    logSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('test_RunFeatureInspectCommand_ValidId_PrintsDetails', () => {
  const { tempDir, registryDir } = createTempTestEnv();
  const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  try {
    const result = runFeatureInspectCommand('auth-feature', { features: registryDir });
    expect(result.success).toBe(true);
    expect(logSpy).toHaveBeenCalled();
  } finally {
    logSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('test_RunFeatureInspectCommand_InvalidId_ReturnsError', () => {
  const { tempDir, registryDir } = createTempTestEnv();

  try {
    const result = runFeatureInspectCommand('nonexistent', { features: registryDir });
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

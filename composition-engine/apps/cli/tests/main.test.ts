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

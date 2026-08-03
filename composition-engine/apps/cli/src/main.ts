#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { getGeneratorInfo, ApplicationGenerator } from '@minecode/generator';
import { FileSystemRegistry } from '@minecode/registry';
import * as readline from 'readline';
import {
  parseBlueprintYaml,
  parseFeatureYaml,
  parseContractYaml,
  parseDependenciesYaml,
  parseYaml,
} from '@minecode/schemas';
import {
  BlueprintValidator,
  FeatureDependencyResolver,
  FeatureConflictDetector,
} from '@minecode/resolver';
import { Composer } from '@minecode/composer';

const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[39m`,
  green: (text: string) => `\x1b[32m${text}\x1b[39m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[39m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[22m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[22m`,
};

export function runInitCommand(): void {
  const blueprintPath = path.resolve(process.cwd(), 'app.yaml');
  if (fs.existsSync(blueprintPath)) {
    console.error(colors.red('Error: app.yaml already exists in the current directory.'));
    process.exit(1);
  }

  const defaultContent = `# Minecode Application Blueprint
# Use this file to define your application and its features.

application:
  name: "My Minecode Application" # The name of your application

stack:
  id: "nextjs-supabase" # The target stack for composition (default: nextjs-supabase)

features:
  # Define the features to include in your application here.
  # Format:
  # <feature-id>:
  #   version: "<semver-range>" # Optional: specific version or range
  #   config:
  #     # Feature-specific configuration values
`;

  try {
    fs.writeFileSync(blueprintPath, defaultContent, 'utf8');
    console.log(colors.green('Successfully initialized app.yaml in the current directory.'));
  } catch (error: any) {
    console.error(colors.red(`Error writing app.yaml: ${error.message || String(error)}`));
    process.exit(1);
  }
}

export interface ProcessedBlueprintResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  blueprint?: any;
  resolvedFeatures?: any[];
}

export function processBlueprintFile(
  blueprintPath: string,
  featuresDir: string
): ProcessedBlueprintResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!fs.existsSync(blueprintPath)) {
    errors.push(`Blueprint file not found at: ${blueprintPath}`);
    return { success: false, errors, warnings };
  }

  let blueprintContent: string;
  try {
    blueprintContent = fs.readFileSync(blueprintPath, 'utf8');
  } catch (error: any) {
    errors.push(`Failed to read blueprint file: ${error.message || String(error)}`);
    return { success: false, errors, warnings };
  }

  // Load Registry
  const registry = new FileSystemRegistry(featuresDir);
  try {
    registry.load();
  } catch (error: any) {
    errors.push(`Failed to load registry: ${error.message || String(error)}`);
    return { success: false, errors, warnings };
  }

  // Parse Blueprint
  let blueprint: any = null;
  try {
    blueprint = parseBlueprintYaml(blueprintContent);
  } catch (error: any) {
    errors.push(`Blueprint parsing failed: ${error.message || String(error)}`);
    return { success: false, errors, warnings };
  }

  // 1. Blueprint Validation
  const validator = new BlueprintValidator(registry);
  const valResult = validator.validate(blueprint);
  errors.push(...valResult.errors);
  warnings.push(...valResult.warnings);

  if (errors.length > 0) {
    return { success: false, errors, warnings, blueprint };
  }

  // 2. Resolve Blueprint Features (Dependency Resolution)
  let resolvedFeatures: any[] = [];
  try {
    const resolver = new FeatureDependencyResolver(registry);
    resolvedFeatures = resolver.resolve(blueprint);
  } catch (error: any) {
    errors.push(`Dependency resolution failed: ${error.message || String(error)}`);
    return { success: false, errors, warnings, blueprint };
  }

  // 3. Detect Conflicts
  try {
    const conflictDetector = new FeatureConflictDetector();
    const stackId = blueprint.stackId || 'nextjs-supabase';
    conflictDetector.detect(resolvedFeatures, stackId);
  } catch (error: any) {
    if (error.conflicts && Array.isArray(error.conflicts)) {
      errors.push(...error.conflicts);
    } else {
      errors.push(`Conflict detection failed: ${error.message || String(error)}`);
    }
    return { success: false, errors, warnings, blueprint, resolvedFeatures };
  }

  return { success: true, errors, warnings, blueprint, resolvedFeatures };
}

export function runValidateCommand(
  blueprintPathArg?: string,
  options?: { features?: string }
): { success: boolean; errors: string[]; warnings: string[] } {
  const blueprintPath = path.resolve(process.cwd(), blueprintPathArg || 'app.yaml');
  const featuresDir =
    options?.features ||
    process.env.MINECODE_FEATURES_DIR ||
    process.env.FEATURES_DIR ||
    'composition-engine/features';

  return processBlueprintFile(blueprintPath, featuresDir);
}

export function runBuildCommand(
  blueprintPathArg?: string,
  options?: { features?: string; outDir?: string }
): { success: boolean; errors: string[]; warnings: string[] } {
  const blueprintPath = path.resolve(process.cwd(), blueprintPathArg || 'app.yaml');
  const featuresDir =
    options?.features ||
    process.env.MINECODE_FEATURES_DIR ||
    process.env.FEATURES_DIR ||
    'composition-engine/features';
  const outDir = options?.outDir || path.resolve(process.cwd(), 'app');

  const result = processBlueprintFile(blueprintPath, featuresDir);
  if (!result.success) {
    return result;
  }

  const errors: string[] = [...result.errors];
  const warnings: string[] = [...result.warnings];

  // Compose application
  try {
    const composer = new Composer();
    const plan = composer.compose(result.resolvedFeatures!, result.blueprint);

    // Generate application files
    const generator = new ApplicationGenerator(outDir);
    generator.generate(plan);

    console.log(
      colors.green(`Successfully composed and generated application: ${plan.applicationName}`)
    );
    console.log(colors.green(`Output written to: ${outDir}`));
  } catch (error: any) {
    errors.push(`Composition or generation failed: ${error.message || String(error)}`);
    return { success: false, errors, warnings };
  }

  return { success: true, errors, warnings };
}

export function runFeatureListCommand(options?: { features?: string }): {
  success: boolean;
  errors: string[];
} {
  const featuresDir =
    options?.features ||
    process.env.MINECODE_FEATURES_DIR ||
    process.env.FEATURES_DIR ||
    'composition-engine/features';
  const errors: string[] = [];

  const registry = new FileSystemRegistry(featuresDir);
  try {
    registry.load();
  } catch (error: any) {
    errors.push(`Failed to load registry: ${error.message || String(error)}`);
    return { success: false, errors };
  }

  const features = registry.listFeatures();
  if (features.length === 0) {
    console.log(colors.yellow('No features found in registry.'));
    return { success: true, errors };
  }

  // Print a nice tabular overview
  // Columns: ID, Version, Name, Category, Description (truncated if too long)
  const columns = [
    { label: 'ID', width: 25, get: (f: any) => f.id },
    { label: 'Version', width: 10, get: (f: any) => f.version },
    { label: 'Name', width: 25, get: (f: any) => f.metadata?.name || f.id },
    { label: 'Category', width: 15, get: (f: any) => f.metadata?.category || '' },
    { label: 'Description', width: 40, get: (f: any) => f.metadata?.description || '' },
  ];

  // Draw table header line
  const headerLine = columns.map((c) => c.label.padEnd(c.width)).join(' | ');
  const separator = columns.map((c) => '-'.repeat(c.width)).join('-|-');

  console.log(colors.bold(headerLine));
  console.log(colors.dim(separator));

  for (const feat of features) {
    const row = columns
      .map((c) => {
        let val = String(c.get(feat));
        if (val.length > c.width) {
          val = val.substring(0, c.width - 3) + '...';
        }
        return val.padEnd(c.width);
      })
      .join(' | ');
    console.log(row);
  }

  return { success: true, errors };
}

export function runFeatureInspectCommand(
  id: string,
  options?: { features?: string }
): { success: boolean; errors: string[] } {
  const featuresDir =
    options?.features ||
    process.env.MINECODE_FEATURES_DIR ||
    process.env.FEATURES_DIR ||
    'composition-engine/features';
  const errors: string[] = [];

  const registry = new FileSystemRegistry(featuresDir);
  try {
    registry.load();
  } catch (error: any) {
    errors.push(`Failed to load registry: ${error.message || String(error)}`);
    return { success: false, errors };
  }

  const feature = registry.getFeature(id);
  if (!feature) {
    errors.push(`Feature with ID '${id}' not found in registry.`);
    return { success: false, errors };
  }

  console.log(colors.bold(`Feature: ${feature.id}`));
  console.log(colors.dim('='.repeat(40)));
  console.log(`${colors.bold('Version:')}     ${feature.version}`);
  console.log(`${colors.bold('Type:')}        ${feature.type}`);
  console.log(`${colors.bold('Name:')}        ${feature.metadata?.name || ''}`);
  console.log(`${colors.bold('Category:')}    ${feature.metadata?.category || ''}`);
  console.log(`${colors.bold('Description:')} ${feature.metadata?.description || ''}`);

  if (feature.metadata?.maintainer) {
    console.log(
      `${colors.bold('Maintainer:')}  ${feature.metadata.maintainer.name || ''} (${feature.metadata.maintainer.type})`
    );
  }
  if (feature.metadata?.stack && feature.metadata.stack.length > 0) {
    console.log(`${colors.bold('Stack(s):')}    ${feature.metadata.stack.join(', ')}`);
  }

  console.log('');
  console.log(colors.bold('Dependencies:'));
  if (!feature.dependencies || feature.dependencies.length === 0) {
    console.log('  None');
  } else {
    for (const dep of feature.dependencies) {
      console.log(`  - ${dep.featureId} (${dep.versionRange})${dep.optional ? ' [Optional]' : ''}`);
    }
  }

  console.log('');
  console.log(colors.bold('Contract:'));
  if (!feature.contract || Object.keys(feature.contract).length === 0) {
    console.log('  None');
  } else {
    const contract = feature.contract;
    if (contract.provides) {
      console.log('  Provides:');
      if (contract.provides.capabilities && contract.provides.capabilities.length > 0) {
        console.log(`    Capabilities: ${contract.provides.capabilities.join(', ')}`);
      }
      if (contract.provides.entities && contract.provides.entities.length > 0) {
        console.log('    Entities:');
        for (const ent of contract.provides.entities) {
          console.log(`      - ${ent.name}: ${ent.description || 'No description'}`);
          if (ent.fields && ent.fields.length > 0) {
            for (const f of ent.fields) {
              console.log(`        * ${f.name} (${f.type})${f.required ? ' [Required]' : ''}`);
            }
          }
        }
      }
      if (contract.provides.permissions && contract.provides.permissions.length > 0) {
        console.log('    Permissions:');
        for (const perm of contract.provides.permissions) {
          console.log(`      - ${perm.name}: ${perm.description || 'No description'}`);
        }
      }
      if (contract.provides.api && contract.provides.api.length > 0) {
        console.log('    API:');
        for (const a of contract.provides.api) {
          console.log(`      - ${a.name} [${a.method || 'GET'}] ${a.path}`);
        }
      }
      if (contract.provides.ui && contract.provides.ui.length > 0) {
        console.log('    UI:');
        for (const u of contract.provides.ui) {
          console.log(`      - ${u.name}: route ${u.route || 'N/A'}, slot ${u.slot || 'N/A'}`);
        }
      }
    }
    if (contract.requires) {
      console.log('  Requires:');
      if (contract.requires.features && contract.requires.features.length > 0) {
        console.log(`    Features: ${contract.requires.features.join(', ')}`);
      }
      if (contract.requires.capabilities && contract.requires.capabilities.length > 0) {
        console.log(`    Capabilities: ${contract.requires.capabilities.join(', ')}`);
      }
    }
    if (contract.conflicts) {
      console.log('  Conflicts:');
      if (contract.conflicts.features && contract.conflicts.features.length > 0) {
        console.log(`    Features: ${contract.conflicts.features.join(', ')}`);
      }
      if (contract.conflicts.capabilities && contract.conflicts.capabilities.length > 0) {
        console.log(`    Capabilities: ${contract.conflicts.capabilities.join(', ')}`);
      }
    }
  }

  if (feature.configSchema) {
    console.log('');
    console.log(colors.bold('Configuration Schema:'));
    console.log(
      JSON.stringify(feature.configSchema, null, 2)
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n')
    );
  }

  return { success: true, errors };
}

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function runFeatureCreateCommand(
  idArg?: string,
  options?: { name?: string; features?: string }
): Promise<{ success: boolean; errors: string[]; warnings: string[]; targetDir?: string }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let id = idArg?.trim();
  if (!id) {
    id = await askQuestion(colors.yellow('Enter Feature ID (e.g. billing-engine): '));
    id = id.trim();
  }
  if (!id) {
    errors.push('Feature ID is required.');
    return { success: false, errors, warnings };
  }

  // Validate ID format (must match featureIdRegex /^[a-zA-Z0-9-_]+$/)
  const featureIdRegex = /^[a-zA-Z0-9-_]+$/;
  if (!featureIdRegex.test(id)) {
    errors.push(`Invalid Feature ID: '${id}'. Must be alphanumeric with dashes or underscores.`);
    return { success: false, errors, warnings };
  }

  let name = options?.name?.trim();
  if (!name) {
    name = await askQuestion(
      colors.yellow(`Enter Feature Name for '${id}' (e.g. Billing Engine): `)
    );
    name = name.trim();
  }
  if (!name) {
    // Fallback to capitalizing ID
    name = id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    warnings.push(`No Feature Name specified. Defaulted to: '${name}'`);
  }

  const defaultBaseDir = 'composition-engine/features';
  const featuresDir =
    options?.features ||
    process.env.MINECODE_FEATURES_DIR ||
    process.env.FEATURES_DIR ||
    defaultBaseDir;

  let targetDir = path.resolve(featuresDir, id);

  // If featuresDir has a 'builtin' directory, let's place it there by default
  const builtinSubdir = path.join(featuresDir, 'builtin');
  if (fs.existsSync(builtinSubdir) && fs.statSync(builtinSubdir).isDirectory()) {
    targetDir = path.resolve(builtinSubdir, id);
  }

  if (fs.existsSync(targetDir)) {
    errors.push(`Directory already exists: ${targetDir}`);
    return { success: false, errors, warnings };
  }

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.mkdirSync(path.join(targetDir, 'modules', 'database'), { recursive: true });
    fs.mkdirSync(path.join(targetDir, 'modules', 'backend'), { recursive: true });
    fs.mkdirSync(path.join(targetDir, 'modules', 'frontend'), { recursive: true });
    fs.mkdirSync(path.join(targetDir, 'modules', 'migration'), { recursive: true });
    fs.mkdirSync(path.join(targetDir, 'modules', 'config'), { recursive: true });
    fs.mkdirSync(path.join(targetDir, 'tests'), { recursive: true });

    // Write .gitkeep files
    const subdirs = ['database', 'backend', 'frontend', 'migration', 'config'];
    for (const subdir of subdirs) {
      fs.writeFileSync(path.join(targetDir, 'modules', subdir, '.gitkeep'), '', 'utf8');
    }

    // Template 1: feature.yaml
    const featureYamlContent = `id: ${id}
version: 1.0.0
type: business
name: "${name}"
description: "Description of ${name}"
maintainer:
  type: builtin
stack:
  - nextjs-supabase
category: Custom
`;
    fs.writeFileSync(path.join(targetDir, 'feature.yaml'), featureYamlContent, 'utf8');

    // Template 2: contract.yaml
    const contractYamlContent = `provides:
  capabilities:
    - ${id}
  entities: []
  permissions: []
  events: []
  extensionPoints: []
  api: []
  ui: []
  navigation: []
requires:
  features: []
  capabilities: []
conflicts:
  features: []
  capabilities: []
`;
    fs.writeFileSync(path.join(targetDir, 'contract.yaml'), contractYamlContent, 'utf8');

    // Template 3: dependencies.yaml
    const dependenciesYamlContent = `# List your feature dependencies here
# Example:
# - featureId: database
#   versionRange: "^1.0.0"
dependencies: []
`;
    fs.writeFileSync(path.join(targetDir, 'dependencies.yaml'), dependenciesYamlContent, 'utf8');

    // Template 4: config.schema.yaml
    const configSchemaYamlContent = `type: object
properties:
  enabled:
    type: boolean
    default: true
required: []
`;
    fs.writeFileSync(path.join(targetDir, 'config.schema.yaml'), configSchemaYamlContent, 'utf8');

    // Template 5: README.md
    const readmeContent = `# ${name} (${id})

Description of the feature \`${name}\`.

## Specifications

- **ID**: \`${id}\`
- **Version**: \`1.0.0\`
- **Type**: \`business\`
- **Category**: \`Custom\`

## Configuration Options

See \`config.schema.yaml\` for full schema definition.

## Extension Points & Contributions

Define any extension points provided or contributions made to other features.

---

*Note: Built-in features intended for official inclusion in Minecode must provide tests, documentation, contracts, and migrations in accordance with the Definition of Done.*
`;
    fs.writeFileSync(path.join(targetDir, 'README.md'), readmeContent, 'utf8');

    // Template 6: tests/index.test.ts
    const testContent = `import { test, expect } from 'vitest';

test('test_MyFeature_Always_Passes', () => {
  expect(true).toBe(true);
});
`;
    fs.writeFileSync(path.join(targetDir, 'tests', 'index.test.ts'), testContent, 'utf8');

    console.log(colors.green(`Successfully scaffolded feature: ${name} (${id})`));
    console.log(colors.green(`Output written to: ${targetDir}`));
  } catch (error: any) {
    errors.push(`Failed to scaffold feature: ${error.message || String(error)}`);
    return { success: false, errors, warnings };
  }

  return { success: true, errors, warnings, targetDir };
}

export function runFeatureValidateSpecificCommand(
  pathOrId: string,
  options?: { features?: string }
): { success: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const defaultBaseDir = 'composition-engine/features';
  const featuresDir =
    options?.features ||
    process.env.MINECODE_FEATURES_DIR ||
    process.env.FEATURES_DIR ||
    defaultBaseDir;

  let featureDir = path.resolve(pathOrId);

  // If pathOrId is not a directory, treat it as a feature ID and search for it in featuresDir
  if (!fs.existsSync(featureDir) || !fs.statSync(featureDir).isDirectory()) {
    // Search registry
    const registry = new FileSystemRegistry(featuresDir);
    try {
      registry.load();
    } catch {
      // If we failed to load registry, don't abort immediately because we might have been given a feature ID
      // but let's log the registry error
    }

    const feature = registry.getFeature(pathOrId);
    if (feature) {
      // Find where feature.yaml is
      // We can scan featuresDir recursively for feature.yaml containing id: pathOrId
      const findFeaturePath = (dir: string): string | null => {
        if (!fs.existsSync(dir)) return null;
        if (fs.existsSync(path.join(dir, 'feature.yaml'))) {
          try {
            const content = fs.readFileSync(path.join(dir, 'feature.yaml'), 'utf8');
            if (content.includes(`id: ${pathOrId}`) || content.includes(`id: "${pathOrId}"`)) {
              return dir;
            }
          } catch {
            // Ignore
          }
        }
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            const res = findFeaturePath(path.join(dir, entry.name));
            if (res) return res;
          }
        }
        return null;
      };
      const foundPath = findFeaturePath(featuresDir);
      if (foundPath) {
        featureDir = foundPath;
      } else {
        errors.push(
          `Feature with ID '${pathOrId}' was found in registry, but its filesystem directory could not be located.`
        );
        return { success: false, errors, warnings };
      }
    } else {
      errors.push(`Specified path or feature ID does not exist: '${pathOrId}'`);
      return { success: false, errors, warnings };
    }
  }

  // Now validate files in featureDir
  const featureYamlPath = path.join(featureDir, 'feature.yaml');
  if (!fs.existsSync(featureYamlPath)) {
    errors.push(`Missing 'feature.yaml' in feature directory: ${featureDir}`);
    return { success: false, errors, warnings };
  }

  // Validate feature.yaml
  let featureObj: any;
  try {
    const content = fs.readFileSync(featureYamlPath, 'utf8');
    featureObj = parseFeatureYaml(content);
  } catch (err: any) {
    if (err.errors && Array.isArray(err.errors)) {
      errors.push(...err.errors.map((e: string) => `feature.yaml: ${e}`));
    } else {
      errors.push(`feature.yaml: ${err.message || String(err)}`);
    }
  }

  // Validate contract.yaml if it exists
  const contractYamlPath = path.join(featureDir, 'contract.yaml');
  if (fs.existsSync(contractYamlPath)) {
    try {
      const content = fs.readFileSync(contractYamlPath, 'utf8');
      parseContractYaml(content);
    } catch (err: any) {
      if (err.errors && Array.isArray(err.errors)) {
        errors.push(...err.errors.map((e: string) => `contract.yaml: ${e}`));
      } else {
        errors.push(`contract.yaml: ${err.message || String(err)}`);
      }
    }
  }

  // Validate dependencies.yaml if it exists
  const dependenciesYamlPath = path.join(featureDir, 'dependencies.yaml');
  if (fs.existsSync(dependenciesYamlPath)) {
    try {
      const content = fs.readFileSync(dependenciesYamlPath, 'utf8');
      parseDependenciesYaml(content);
    } catch (err: any) {
      if (err.errors && Array.isArray(err.errors)) {
        errors.push(...err.errors.map((e: string) => `dependencies.yaml: ${e}`));
      } else {
        errors.push(`dependencies.yaml: ${err.message || String(err)}`);
      }
    }
  }

  // Validate config.schema.yaml if it exists
  const configSchemaPath = path.join(featureDir, 'config.schema.yaml');
  if (fs.existsSync(configSchemaPath)) {
    try {
      const content = fs.readFileSync(configSchemaPath, 'utf8');
      parseYaml(content);
    } catch (err: any) {
      errors.push(`config.schema.yaml: ${err.message || String(err)}`);
    }
  }

  // Check if it's a builtin feature being added to official list, and print warnings if missing requirements
  if (featureObj) {
    const isBuiltinFeature =
      featureObj.maintainer?.type === 'builtin' ||
      featureDir.includes(path.join('features', 'builtin'));

    if (isBuiltinFeature) {
      const testsDir = path.join(featureDir, 'tests');
      if (!fs.existsSync(testsDir) || !fs.statSync(testsDir).isDirectory()) {
        warnings.push(
          `Built-in feature '${featureObj.id}' should provide a 'tests/' directory for automated tests.`
        );
      }
      const readmePath = path.join(featureDir, 'README.md');
      if (!fs.existsSync(readmePath)) {
        warnings.push(
          `Built-in feature '${featureObj.id}' should provide a 'README.md' file for documentation.`
        );
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

const program = new Command();

program
  .name('minecode')
  .description('Minecode CLI: Modular AI-first software architecture compiler')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new app.yaml blueprint in the current directory')
  .action(() => {
    runInitCommand();
  });

program
  .command('validate')
  .description(
    'Validate an application blueprint for schema correctness, dependencies, and conflicts'
  )
  .argument('[blueprintPath]', 'Path to the app.yaml blueprint file', 'app.yaml')
  .option('-f, --features <dir>', 'Path to features registry directory')
  .action((blueprintPath, options) => {
    const result = runValidateCommand(blueprintPath, options);
    if (result.warnings.length > 0) {
      console.warn(colors.yellow('Warnings:'));
      result.warnings.forEach((w) => console.warn(colors.yellow(`  - ${w}`)));
    }

    if (!result.success) {
      console.error(colors.red('Validation Failed:'));
      result.errors.forEach((e) => console.error(colors.red(`  - ${e}`)));
      process.exit(1);
    } else {
      console.log(colors.green('Blueprint is valid!'));
      process.exit(0);
    }
  });

program
  .command('build')
  .description('Compile and compose the application blueprint into code')
  .argument('[blueprintPath]', 'Path to the app.yaml blueprint file', 'app.yaml')
  .option('-f, --features <dir>', 'Path to features registry directory')
  .option('-o, --out-dir <dir>', 'Output directory', 'app')
  .action((blueprintPath, options) => {
    const result = runBuildCommand(blueprintPath, options);
    if (result.warnings.length > 0) {
      console.warn(colors.yellow('Warnings:'));
      result.warnings.forEach((w) => console.warn(colors.yellow(`  - ${w}`)));
    }

    if (!result.success) {
      console.error(colors.red('Build Failed:'));
      result.errors.forEach((e) => console.error(colors.red(`  - ${e}`)));
      process.exit(1);
    } else {
      process.exit(0);
    }
  });

const featureCommand = program.command('feature').description('Manage and inspect features');

featureCommand
  .command('list')
  .description('List all available features in the registry')
  .option('-f, --features <dir>', 'Path to features registry directory')
  .action((options) => {
    const result = runFeatureListCommand(options);
    if (!result.success) {
      result.errors.forEach((e) => console.error(colors.red(`  - ${e}`)));
      process.exit(1);
    } else {
      process.exit(0);
    }
  });

featureCommand
  .command('inspect')
  .description('Inspect details of a specific feature')
  .argument('<id>', 'ID of the feature to inspect')
  .option('-f, --features <dir>', 'Path to features registry directory')
  .action((id, options) => {
    const result = runFeatureInspectCommand(id, options);
    if (!result.success) {
      result.errors.forEach((e) => console.error(colors.red(`  - ${e}`)));
      process.exit(1);
    } else {
      process.exit(0);
    }
  });

featureCommand
  .command('create [id]')
  .alias('scaffold')
  .description('Scaffold a new feature structure with templates and guidelines')
  .option('-n, --name <name>', 'Name of the feature')
  .option('-f, --features <dir>', 'Path to features registry directory')
  .action(async (id, options) => {
    const result = await runFeatureCreateCommand(id, options);
    if (result.warnings.length > 0) {
      console.warn(colors.yellow('Warnings:'));
      result.warnings.forEach((w) => console.warn(colors.yellow(`  - ${w}`)));
    }

    if (!result.success) {
      console.error(colors.red('Scaffolding Failed:'));
      result.errors.forEach((e) => console.error(colors.red(`  - ${e}`)));
      process.exit(1);
    } else {
      process.exit(0);
    }
  });

featureCommand
  .command('validate <pathOrId>')
  .alias('check')
  .description('Validate a specific feature on disk for schemas, contracts, and quality guidelines')
  .option('-f, --features <dir>', 'Path to features registry directory')
  .action((pathOrId, options) => {
    const result = runFeatureValidateSpecificCommand(pathOrId, options);
    if (result.warnings.length > 0) {
      console.warn(colors.yellow('Warnings:'));
      result.warnings.forEach((w) => console.warn(colors.yellow(`  - ${w}`)));
    }

    if (!result.success) {
      console.error(colors.red('Validation Failed:'));
      result.errors.forEach((e) => console.error(colors.red(`  - ${e}`)));
      process.exit(1);
    } else {
      console.log(colors.green('Feature is valid and complies with guidelines!'));
      process.exit(0);
    }
  });

export function runCLI(argv?: string[]): string {
  const info = `Minecode CLI initialised.\nUsing: ${getGeneratorInfo()}`;

  if (process.env.VITEST) {
    console.log(info);
    return info;
  }

  const args = argv || process.argv;
  if (args.length <= 2) {
    console.log(info);
    console.log('');
    program.outputHelp();
  } else {
    program.parse(args);
  }

  return info;
}

runCLI();

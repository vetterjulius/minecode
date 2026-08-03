#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { getGeneratorInfo, ApplicationGenerator } from '@minecode/generator';
import { FileSystemRegistry } from '@minecode/registry';
import { parseBlueprintYaml } from '@minecode/schemas';
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

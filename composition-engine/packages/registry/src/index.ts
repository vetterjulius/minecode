/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
import * as path from 'path';
import { Feature } from '@minecode/core';
import {
  parseFeatureYaml,
  parseContractYaml,
  parseDependenciesYaml,
  parseYaml,
  getSchemaInfo,
} from '@minecode/schemas';

export function getRegistryInfo(): string {
  return `Minecode Registry relying on: ${getSchemaInfo()}`;
}

export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryError';
    Object.setPrototypeOf(this, RegistryError.prototype);
  }
}

export class FileSystemRegistry {
  private features: Map<string, Feature> = new Map();
  private rootPath: string;

  constructor(rootPath: string = 'features') {
    this.rootPath = rootPath;
  }

  /**
   * Recursively scans the root directory to discover, validate, and load all features.
   * Throws an error (Compiler Approach) if any feature fails to parse or validate.
   */
  public load(): void {
    this.features.clear();
    const featureDirs = this.findFeatureDirs(this.rootPath);

    for (const dir of featureDirs) {
      try {
        const feature = this.loadFeatureFromDir(dir);
        if (this.features.has(feature.id)) {
          throw new RegistryError(`Duplicate feature ID found: '${feature.id}' at path '${dir}'`);
        }
        this.features.set(feature.id, feature);
      } catch (error: unknown) {
        // If it's already a RegistryError or SchemaValidationError, rethrow it.
        // Otherwise, wrap it in a RegistryError.
        if (error instanceof RegistryError) {
          throw error;
        }
        if (
          error &&
          typeof error === 'object' &&
          'name' in error &&
          error.name === 'SchemaValidationError'
        ) {
          throw error;
        }
        const msg = error instanceof Error ? error.message : String(error);
        throw new RegistryError(`Failed to load feature in directory '${dir}': ${msg}`);
      }
    }

    // Validate subGenerators declared by loaded features
    const globalIds = this.getGlobalSubGeneratorIds();

    for (const feature of this.features.values()) {
      if (feature.subGenerators && feature.subGenerators.length > 0) {
        for (const subGenId of feature.subGenerators) {
          let exists = globalIds.has(subGenId);

          if (!exists && feature.featureDir) {
            const localPath = path.join(feature.featureDir, 'sub-generators', `${subGenId}.ts`);
            const localJsPath = path.join(feature.featureDir, 'sub-generators', `${subGenId}.js`);
            if (fs.existsSync(localPath) || fs.existsSync(localJsPath)) {
              exists = true;
            }
          }

          if (!exists) {
            throw new RegistryError(
              `Feature '${feature.id}' depends on missing sub-generator '${subGenId}'. ` +
                `It must exist either globally in sub-generators or locally in '${feature.id}/sub-generators/'.`
            );
          }
        }
      }
    }
  }

  private getGlobalSubGeneratorIds(): Set<string> {
    const ids = new Set<string>();
    const possiblePaths = [
      path.resolve(process.cwd(), 'composition-engine/packages/sub-generators/src/generators'),
      path.resolve(process.cwd(), 'packages/sub-generators/src/generators'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
        const files = fs.readdirSync(p);
        for (const file of files) {
          if (file.endsWith('.ts') || file.endsWith('.js')) {
            const id = path.basename(file, path.extname(file));
            ids.add(id);
          }
        }
        break;
      }
    }
    return ids;
  }

  /**
   * Returns a list of all loaded features.
   */
  public listFeatures(): Feature[] {
    return Array.from(this.features.values());
  }

  /**
   * Retrieves a loaded feature by its ID.
   */
  public getFeature(id: string): Feature | undefined {
    return this.features.get(id);
  }

  /**
   * Checks if a feature with the given ID exists in the registry.
   */
  public hasFeature(id: string): boolean {
    return this.features.has(id);
  }

  /**
   * Searches the loaded features case-insensitively across ID, name, description, and category.
   */
  public searchFeatures(query: string): Feature[] {
    if (!query) return this.listFeatures();
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery === '') return this.listFeatures();

    return this.listFeatures().filter((feature) => {
      const id = feature.id.toLowerCase();
      const name = (feature.metadata?.name || '').toLowerCase();
      const description = (feature.metadata?.description || '').toLowerCase();
      const category = (feature.metadata?.category || '').toLowerCase();

      return (
        id.includes(normalizedQuery) ||
        name.includes(normalizedQuery) ||
        description.includes(normalizedQuery) ||
        category.includes(normalizedQuery)
      );
    });
  }

  /**
   * Recursively scans the directory to find directories containing `feature.yaml`.
   */
  private findFeatureDirs(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) {
      return results;
    }

    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
      return results;
    }

    // If this directory itself contains 'feature.yaml', it's a feature folder.
    if (fs.existsSync(path.join(dir, 'feature.yaml'))) {
      results.push(dir);
      return results;
    }

    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of list) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }
        results.push(...this.findFeatureDirs(fullPath));
      }
    }
    return results;
  }

  /**
   * Loads a feature from a specific folder.
   */
  private loadFeatureFromDir(featureDir: string): Feature {
    const featureYamlPath = path.join(featureDir, 'feature.yaml');
    const featureYamlContent = fs.readFileSync(featureYamlPath, 'utf8');
    const feature = parseFeatureYaml(featureYamlContent);

    // Load config.schema.yaml if it exists
    const configSchemaPath = path.join(featureDir, 'config.schema.yaml');
    if (fs.existsSync(configSchemaPath)) {
      const configSchemaContent = fs.readFileSync(configSchemaPath, 'utf8');
      try {
        const configSchema = parseYaml(configSchemaContent) as Record<string, unknown>;
        feature.configSchema = configSchema;
      } catch (err: any) {
        throw new RegistryError(
          `Failed to parse config.schema.yaml in directory '${featureDir}': ${err.message || err}`
        );
      }
    }

    // Load separate contract.yaml if it exists
    const contractYamlPath = path.join(featureDir, 'contract.yaml');
    if (fs.existsSync(contractYamlPath)) {
      const contractYamlContent = fs.readFileSync(contractYamlPath, 'utf8');
      const contract = parseContractYaml(contractYamlContent);

      const hasInlinedContract =
        feature.contract &&
        ((feature.contract.provides && Object.keys(feature.contract.provides).length > 0) ||
          (feature.contract.requires && Object.keys(feature.contract.requires).length > 0));

      if (hasInlinedContract) {
        console.warn(
          `[WARNING] Feature '${feature.id}' has both inlined 'contract' in feature.yaml and a separate contract.yaml. The separate contract.yaml will override the inlined contract.`
        );
      }
      feature.contract = contract;
    }

    // Load separate dependencies.yaml if it exists
    const dependenciesYamlPath = path.join(featureDir, 'dependencies.yaml');
    if (fs.existsSync(dependenciesYamlPath)) {
      const dependenciesYamlContent = fs.readFileSync(dependenciesYamlPath, 'utf8');
      const dependencies = parseDependenciesYaml(dependenciesYamlContent);

      const hasInlinedDependencies = feature.dependencies && feature.dependencies.length > 0;

      if (hasInlinedDependencies) {
        console.warn(
          `[WARNING] Feature '${feature.id}' has both inlined 'dependencies' in feature.yaml and a separate dependencies.yaml. The separate dependencies.yaml will override the inlined dependencies.`
        );
      }
      feature.dependencies = dependencies;
    }

    feature.featureDir = featureDir;

    return feature;
  }
}

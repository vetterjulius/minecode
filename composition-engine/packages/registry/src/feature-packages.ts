import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { RegistryError } from './errors.js';

/**
 * A feature library distributed as an npm package. Its package.json carries:
 *
 *   "minecode": {
 *     "features": "features",                                  // directory with feature folders
 *     "stacks": { "nextjs-supabase": "./dist/nextjs.js" }      // per-stack behavior module
 *   }
 *
 * A stack module exports `behaviors`: a map from behavior id (as named in the package's
 * contracts) to the stack-specific builder.
 */
export interface FeaturePackage {
  name: string;
  version: string;
  dir: string;
  /** Absolute path of the directory containing the package's features, if it ships any. */
  featuresDir?: string;
  /** Stack id → absolute path of the module implementing the package's behaviors for that stack. */
  stackModules: Record<string, string>;
}

interface PackageManifest {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  minecode?: { features?: string; stacks?: Record<string, string> };
}

function readJson(file: string): PackageManifest | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}

function findInstalled(projectDir: string, name: string): string | undefined {
  let dir = path.resolve(projectDir);
  for (;;) {
    const candidate = path.join(dir, 'node_modules', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Finds feature packages among the (dev)dependencies of the project's package.json.
 * Dependencies without a "minecode" field are ordinary libraries and are ignored.
 * Declared but not installed dependencies are skipped silently: they are not feature packages
 * until installed, and a missing feature fails later with the usual resolver error.
 */
export function discoverFeaturePackages(projectDir: string): FeaturePackage[] {
  const manifest = readJson(path.join(projectDir, 'package.json'));
  if (!manifest) return [];
  const names = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).sort();
  const found: FeaturePackage[] = [];

  for (const name of names) {
    const dir = findInstalled(projectDir, name);
    const pkg = dir ? readJson(path.join(dir, 'package.json')) : undefined;
    const meta = pkg?.minecode;
    if (!dir || !meta) continue;

    const within = (rel: string, what: string): string => {
      const abs = path.resolve(dir, rel);
      if (abs !== dir && !abs.startsWith(dir + path.sep)) {
        throw new RegistryError(
          `Feature package '${name}': ${what} '${rel}' points outside the package`
        );
      }
      return abs;
    };

    const stackModules: Record<string, string> = {};
    for (const [stackId, rel] of Object.entries(meta.stacks ?? {})) {
      stackModules[stackId] = within(String(rel), `stack module for '${stackId}'`);
    }
    found.push({
      name,
      version: String(pkg?.version ?? '0.0.0'),
      dir,
      featuresDir: meta.features ? within(String(meta.features), 'features directory') : undefined,
      stackModules,
    });
  }
  return found;
}

/** Loads the behavior implementations a package ships for one stack. */
export async function loadStackBehaviors(
  pkg: FeaturePackage,
  stackId: string
): Promise<Record<string, unknown>> {
  const file = pkg.stackModules[stackId];
  if (!file) return {};
  const mod = await import(pathToFileURL(file).href);
  const behaviors = mod.behaviors;
  if (!behaviors || typeof behaviors !== 'object') {
    throw new RegistryError(
      `Feature package '${pkg.name}': stack module for '${stackId}' must export 'behaviors'`
    );
  }
  return behaviors;
}

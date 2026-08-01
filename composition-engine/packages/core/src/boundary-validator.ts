import * as path from 'path';

export interface ProjectInfo {
  name: string;
  dependencies: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface ValidationError {
  type: 'boundary' | 'import' | 'relative-escape';
  message: string;
  project: string;
  file?: string;
}

const LAYERS = [
  '@minecode/core',
  '@minecode/schemas',
  '@minecode/registry',
  '@minecode/resolver',
  '@minecode/composer',
  '@minecode/generator',
];

const APPS = ['@minecode/cli', '@minecode/mcp-server'];

function getLayerIndex(name: string): number {
  return LAYERS.indexOf(name);
}

/**
 * Validates package.json dependencies according to layering rules.
 */
export function validatePackageDependencies(
  projects: Record<string, ProjectInfo>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [name, info] of Object.entries(projects)) {
    const isApp = APPS.includes(name);
    const layerIndex = getLayerIndex(name);

    const allDeps = {
      ...info.dependencies,
      ...info.peerDependencies,
    };

    for (const dep of Object.keys(allDeps)) {
      if (dep.startsWith('@minecode/')) {
        const depInfo = projects[dep];

        // If the dependency is part of our monorepo
        if (!depInfo) {
          errors.push({
            type: 'boundary',
            project: name,
            message: `Package '${name}' depends on an unknown monorepo package '${dep}'.`,
          });
          continue;
        }

        const depIsApp = APPS.includes(dep);
        const depLayerIndex = getLayerIndex(dep);

        if (isApp) {
          if (depIsApp) {
            errors.push({
              type: 'boundary',
              project: name,
              message: `App '${name}' is not allowed to depend on another app '${dep}'.`,
            });
          }
        } else {
          // It is a library layer package
          if (depIsApp) {
            errors.push({
              type: 'boundary',
              project: name,
              message: `Package '${name}' is not allowed to depend on app '${dep}'.`,
            });
          } else {
            // Check dependency layer rules
            if (depLayerIndex >= layerIndex) {
              errors.push({
                type: 'boundary',
                project: name,
                message: `Package '${name}' (layer index ${layerIndex}) is not allowed to depend on '${dep}' (layer index ${depLayerIndex}). Expected strict lower-layer dependency.`,
              });
            }
          }
        }
      }
    }
  }

  return errors;
}

/**
 * Validates TypeScript file imports.
 */
export function validateFileImports(
  projectName: string,
  filePath: string,
  content: string,
  packageRootDir: string,
  declaredDeps: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const depSet = new Set(declaredDeps);

  // Simple regex to match static/dynamic import/export statements
  const importRegex = /(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1] || match[2];
    if (!importPath) continue;

    // Check relative imports that attempt to escape package root
    if (importPath.startsWith('.')) {
      const absoluteImportPath = path.resolve(path.dirname(filePath), importPath);
      const absolutePkgRoot = path.resolve(packageRootDir);
      const isWithinRoot =
        absoluteImportPath === absolutePkgRoot ||
        absoluteImportPath.startsWith(absolutePkgRoot + path.sep);
      if (!isWithinRoot) {
        errors.push({
          type: 'relative-escape',
          project: projectName,
          file: filePath,
          message: `File '${filePath}' has relative import '${importPath}' that escapes the package boundary.`,
        });
      }
    }

    if (importPath.startsWith('@minecode/')) {
      const matchName = importPath.match(/^(@minecode\/[^/]+)/);
      if (matchName) {
        const importedPkg = matchName[1];
        if (!depSet.has(importedPkg) && importedPkg !== projectName) {
          errors.push({
            type: 'import',
            project: projectName,
            file: filePath,
            message: `File '${filePath}' imports '${importedPkg}' but it is not declared as a dependency in its package.json.`,
          });
        }
      }
    }
  }

  return errors;
}

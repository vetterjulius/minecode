import fs from 'fs';
import path from 'path';

// Define the unidirectional layers, from bottom to top
const LAYERS = [
  '@minecode/core',
  '@minecode/schemas',
  '@minecode/registry',
  '@minecode/resolver',
  '@minecode/composer',
  '@minecode/nextjs-supabase',
  '@minecode/generator'
];

const APPS = [
  '@minecode/cli',
  '@minecode/mcp-server'
];

function getLayerIndex(name) {
  return LAYERS.indexOf(name);
}

const PACKAGES_DIR = 'composition-engine/packages';
const APPS_DIR = 'composition-engine/apps';
const STACKS_DIR = 'composition-engine/stacks';

function getProjectDirectories() {
  const dirs = [];

  if (fs.existsSync(PACKAGES_DIR)) {
    for (const item of fs.readdirSync(PACKAGES_DIR)) {
      const fullPath = path.join(PACKAGES_DIR, item);
      if (fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'package.json'))) {
        dirs.push(fullPath);
      }
    }
  }

  if (fs.existsSync(STACKS_DIR)) {
    for (const item of fs.readdirSync(STACKS_DIR)) {
      const fullPath = path.join(STACKS_DIR, item);
      if (fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'package.json'))) {
        dirs.push(fullPath);
      }
    }
  }

  if (fs.existsSync(APPS_DIR)) {
    for (const item of fs.readdirSync(APPS_DIR)) {
      const fullPath = path.join(APPS_DIR, item);
      if (fs.statSync(fullPath).isDirectory() && fs.existsSync(path.join(fullPath, 'package.json'))) {
        dirs.push(fullPath);
      }
    }
  }

  return dirs;
}

function findTsFiles(dir) {
  const files = [];
  function walk(currentDir) {
    if (
      currentDir.includes('node_modules') ||
      currentDir.includes('dist') ||
      currentDir.includes('tests')
    ) {
      return;
    }
    const list = fs.readdirSync(currentDir);
    for (const file of list) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

const projects = getProjectDirectories();
const projectMap = {};

// Load package.json for each project
for (const dir of projects) {
  const pkgJsonPath = path.join(dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  projectMap[pkg.name] = {
    name: pkg.name,
    dependencies: pkg.dependencies || {},
    peerDependencies: pkg.peerDependencies || {},
    dir
  };
}

let hasError = false;

function logError(message) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`);
  hasError = true;
}

// 1. Validate package.json dependency layering
for (const [name, info] of Object.entries(projectMap)) {
  const isApp = APPS.includes(name);
  const layerIndex = getLayerIndex(name);
  const allDeps = {
    ...info.dependencies,
    ...info.peerDependencies
  };

  for (const dep of Object.keys(allDeps)) {
    if (dep.startsWith('@minecode/')) {
      const depInfo = projectMap[dep];

      if (!depInfo) {
        logError(`Package '${name}' depends on an unknown monorepo package '${dep}'.`);
        continue;
      }

      const depIsApp = APPS.includes(dep);
      const depLayerIndex = getLayerIndex(dep);

      if (isApp) {
        if (depIsApp) {
          logError(`App '${name}' is not allowed to depend on another app '${dep}'.`);
        }
      } else {
        if (depIsApp) {
          logError(`Package '${name}' is not allowed to depend on app '${dep}'.`);
        } else {
          if (depLayerIndex >= layerIndex) {
            logError(`Package '${name}' (layer index ${layerIndex}) is not allowed to depend on '${dep}' (layer index ${depLayerIndex}). Expected strict lower-layer dependency.`);
          }
        }
      }
    }
  }
}

// 2. Validate source code file imports (untracked imports, relative escape paths)
for (const [name, info] of Object.entries(projectMap)) {
  const tsFiles = findTsFiles(info.dir);
  const declaredDeps = new Set([
    ...Object.keys(info.dependencies),
    ...Object.keys(info.peerDependencies)
  ]);

  for (const file of tsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const importRegex = /(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      if (!importPath) continue;

      // Check relative imports that attempt to escape package root
      if (importPath.startsWith('.')) {
        const absoluteImportPath = path.resolve(path.dirname(file), importPath);
        const absolutePkgRoot = path.resolve(info.dir);
        if (!absoluteImportPath.startsWith(absolutePkgRoot)) {
          logError(`File '${file}' has relative import '${importPath}' that escapes the package boundary.`);
        }
      }

      // Check unlisted dependencies
      if (importPath.startsWith('@minecode/')) {
        const matchName = importPath.match(/^(@minecode\/[^/]+)/);
        if (matchName) {
          const importedPkg = matchName[1];
          if (!declaredDeps.has(importedPkg) && importedPkg !== name) {
            logError(`File '${file}' imports '${importedPkg}' but it is not declared as a dependency in its package.json.`);
          }
        }
      }
    }
  }
}

if (hasError) {
  console.log('\n\x1b[31m[FAILED]\x1b[0m Package boundaries check failed.');
  process.exit(1);
} else {
  console.log('\x1b[32m[SUCCESS]\x1b[0m All package boundaries and unidirectional dependency rules are respected!');
  process.exit(0);
}

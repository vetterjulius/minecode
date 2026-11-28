import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "Builds" oracle: the workspace installs its dependencies and its own build script succeeds.
 * Framework-agnostic: it runs what the workspace declares, nothing Minecode specific.
 */
export function runBuildOracle(workspace, { timeoutMs = 15 * 60 * 1000 } = {}) {
  const pkgFile = path.join(workspace, 'package.json');
  if (!fs.existsSync(pkgFile)) return { builds: false, log: 'no package.json' };
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  if (!pkg.scripts?.build) return { builds: false, log: 'no build script' };
  const run = (args) =>
    spawnSync('npm', args, {
      cwd: workspace,
      encoding: 'utf8',
      timeout: timeoutMs,
      maxBuffer: 64 * 1024 * 1024,
    });
  const install = run(['install', '--no-audit', '--no-fund']);
  if (install.status !== 0)
    return { builds: false, log: `npm install failed\n${install.stderr}`.slice(-4000) };
  const build = run(['run', 'build']);
  return { builds: build.status === 0, log: `${build.stdout}\n${build.stderr}`.slice(-4000) };
}

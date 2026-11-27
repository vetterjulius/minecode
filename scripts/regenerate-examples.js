import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const EXAMPLES_DIR = 'composition-engine/examples';
const CLI = 'composition-engine/apps/cli/dist/main.js';
const MANAGED_DIRS = ['app', 'generated', 'supabase', 'config', 'lib', 'types', 'components'];

function exampleApps() {
  return fs
    .readdirSync(EXAMPLES_DIR)
    .filter((entry) => fs.existsSync(path.join(EXAMPLES_DIR, entry, 'app.yaml')));
}

function regenerate(appName) {
  const appDir = path.join(EXAMPLES_DIR, appName);
  for (const dir of MANAGED_DIRS) {
    fs.rmSync(path.join(appDir, dir), { recursive: true, force: true });
  }
  execFileSync('node', [CLI, 'build', path.join(appDir, 'app.yaml'), '--out-dir', appDir], {
    stdio: 'inherit',
  });
}

exampleApps().forEach(regenerate);

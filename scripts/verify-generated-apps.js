import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EXAMPLES_DIR = 'composition-engine/examples';

function listExampleApps() {
  return fs
    .readdirSync(EXAMPLES_DIR)
    .filter((entry) => fs.existsSync(path.join(EXAMPLES_DIR, entry, 'app.yaml')));
}

function run(command, cwd) {
  execSync(command, { cwd, stdio: 'inherit' });
}

function verifyApp(appName) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `minecode-verify-${appName}-`));
  const target = path.join(workDir, appName);
  fs.cpSync(path.join(EXAMPLES_DIR, appName), target, { recursive: true });
  try {
    run('npm install --no-audit --no-fund --legacy-peer-deps', target);
    run('npx tsc --noEmit', target);
    run('npx next build', target);
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

function main() {
  const failures = [];
  for (const appName of listExampleApps()) {
    console.log(`\n=== Verifying generated app: ${appName}`);
    try {
      verifyApp(appName);
    } catch {
      failures.push(appName);
    }
  }
  if (failures.length > 0) {
    console.error(`\n[FAILURE] Generated apps failed to build: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('\n[SUCCESS] All generated apps typecheck and build.');
}

main();

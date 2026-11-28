import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Copies an application workspace (without dependencies and build output) to a scratch directory. */
export function copyWorkspace(source) {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-app-'));
  fs.cpSync(source, target, {
    recursive: true,
    filter: (src) => !/(^|\/)(node_modules|\.next)(\/|$)/.test(src),
  });
  return target;
}

export function installAndBuild(dir, env = {}) {
  const opts = {
    cwd: dir,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env },
  };
  const install = spawnSync('npm', ['install', '--no-audit', '--no-fund'], opts);
  if (install.status !== 0) throw new Error(`npm install failed:\n${install.stderr}`);
  const build = spawnSync('npm', ['run', 'build'], opts);
  if (build.status !== 0)
    throw new Error(`build failed:\n${build.stdout}\n${build.stderr}`.slice(-4000));
}

/** Starts the built application with `npm start` on a free port; resolves once it answers. */
export async function startApp(dir, { port, env }) {
  const child = spawn('npm', ['start', '--', '-p', String(port)], {
    cwd: dir,
    env: { ...process.env, ...env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; ; i++) {
    try {
      await fetch(base + '/', { redirect: 'manual' });
      break;
    } catch {
      if (i > 150) throw new Error(`application did not start:\n${log}`);
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return {
    base,
    log: () => log,
    stop: () => {
      child.kill('SIGTERM');
    },
  };
}

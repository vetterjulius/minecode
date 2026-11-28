import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** Directories that are build output or dependencies, never part of a run's artifact. */
export const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'coverage', '.turbo']);

export function walkFiles(root, skip = SKIP_DIRS) {
  const out = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  visit(root);
  return out.sort();
}

/** Content hash of a workspace: paths and bytes, independent of timestamps and order. */
export function hashWorkspace(root) {
  const hash = crypto.createHash('sha256');
  for (const file of walkFiles(root)) {
    hash.update(`${file}\0`);
    hash.update(fs.readFileSync(path.join(root, file)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

/** SQL files anywhere in the workspace, in path order. Oracles must not assume a layout. */
export function findSqlFiles(root) {
  return walkFiles(root).filter((f) => f.endsWith('.sql'));
}

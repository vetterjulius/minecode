import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { walkFiles } from './files.mjs';

function changedLines(left, right) {
  const result = spawnSync('git', ['diff', '--no-index', '--numstat', '--', left, right], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  // git exits with 1 when the files differ
  if (result.status !== 0 && result.status !== 1)
    throw new Error(`git diff failed: ${result.stderr}`);
  const [added, removed] = result.stdout.split('\n')[0]?.split('\t') ?? [];
  return (Number(added) || 0) + (Number(removed) || 0); // binary files count as 0 lines
}

/**
 * Size of a change between two workspace snapshots (before and after the follow-up requirement).
 * Dependency and build directories are ignored. Lines changed = lines added + lines removed.
 */
export function diffWorkspaces(before, after) {
  const names = [...new Set([...walkFiles(before), ...walkFiles(after)])].sort();
  let diffLines = 0;
  let filesTouched = 0;
  for (const name of names) {
    const left = path.join(before, name);
    const right = path.join(after, name);
    const hasLeft = fs.existsSync(left);
    const hasRight = fs.existsSync(right);
    if (hasLeft && hasRight && fs.readFileSync(left).equals(fs.readFileSync(right))) continue;
    filesTouched += 1;
    diffLines += changedLines(hasLeft ? left : '/dev/null', hasRight ? right : '/dev/null');
  }
  return { diffLines, filesTouched };
}

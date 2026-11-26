import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { CompositionPlan, GeneratedFileRecord, SchemaLock, createSnapshot } from '@minecode/core';
import { NextJsSupabaseAdapter } from '@minecode/nextjs-supabase';

export const LOCK_FILE = 'app.lock.json';

const ROOT_FILES = new Set([
  'package.json',
  'tsconfig.json',
  'postcss.config.js',
  'tailwind.config.ts',
  'next.config.mjs',
  '.env.local',
]);

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

export interface GenerationReport {
  /** Files created or overwritten because nobody had edited them. */
  written: string[];
  unchanged: string[];
  /** Edited by a person while the generator wants a different version; theirs is kept and the new version is saved as `<file>.minecode-new`. */
  conflicts: string[];
  /** Files from an earlier generation that the blueprint no longer produces; left in place. */
  orphaned: string[];
}

export function readLock(outDir: string): SchemaLock | undefined {
  const file = path.join(outDir, LOCK_FILE);
  if (!fs.existsSync(file)) return undefined;
  const lock = JSON.parse(fs.readFileSync(file, 'utf8')) as SchemaLock;
  if (lock.version !== 1) {
    throw new Error(`Unsupported ${LOCK_FILE} version ${String(lock.version)}`);
  }
  return lock;
}

function countMigrations(files: Record<string, string>): number {
  return Object.keys(files).filter((f) => f.startsWith('supabase/migrations/')).length;
}

export class ApplicationGenerator {
  public readonly outDir: string;

  constructor(outDir: string) {
    if (!outDir) {
      throw new Error('Output directory path must be specified.');
    }
    this.outDir = outDir;
  }

  public generate(
    plan: CompositionPlan,
    options?: { runnable?: boolean; force?: boolean }
  ): GenerationReport {
    if (!plan) {
      throw new Error('Composition plan must be specified.');
    }

    const skeletonDirs = [
      path.join(this.outDir, 'app'),
      path.join(this.outDir, 'generated'),
      path.join(this.outDir, 'extensions'),
      path.join(this.outDir, 'config'),
    ];

    for (const dir of skeletonDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const stackId = plan.stackId || 'nextjs-supabase';
    if (stackId !== 'nextjs-supabase') {
      throw new Error(`Unsupported stack ID: '${stackId}'.`);
    }

    const adapter = new NextJsSupabaseAdapter();
    const baseline = readLock(this.outDir);
    const virtualFiles = adapter.generate(
      baseline ? { ...plan, schemaBaseline: baseline } : plan,
      options
    );
    const lock: SchemaLock = {
      version: 1,
      schema: createSnapshot(
        plan.database,
        plan.permissions,
        plan.migrations.map((m) => m.name),
        plan.featureConfig
      ),
      migrationCount: (baseline?.migrationCount ?? 0) + countMigrations(virtualFiles),
    };
    const previous = baseline?.files ?? {};
    const report: GenerationReport = { written: [], unchanged: [], conflicts: [], orphaned: [] };
    // Entries of earlier generations stay (migrations are only emitted once).
    const records: Record<string, GeneratedFileRecord> = { ...previous };
    const toFormat: string[] = [];
    const produced = new Set<string>();

    for (const [relPath, content] of Object.entries(virtualFiles)) {
      const targetRel = this.targetPath(relPath);
      produced.add(targetRel);
      const target = path.join(this.outDir, targetRel);
      const generated = sha256(content);
      const entry = previous[targetRel];
      const exists = fs.existsSync(target);
      const diskHash = exists ? sha256(fs.readFileSync(target, 'utf8')) : undefined;
      const generatorChanged = !entry || entry.generated !== generated;
      const editedByUser = exists && (!entry || diskHash !== entry.disk);

      const write = () => {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content, 'utf8');
        toFormat.push(target);
        records[targetRel] = { generated, disk: '' };
        report.written.push(targetRel);
      };

      if (!exists) {
        // A deleted file whose generated source did not change stays deleted.
        if (entry && !generatorChanged && !options?.force) report.unchanged.push(targetRel);
        else write();
      } else if (options?.force) {
        write();
      } else if (!editedByUser) {
        if (generatorChanged) write();
        else report.unchanged.push(targetRel);
      } else if (entry && !generatorChanged) {
        // Edited by a person, generator output unchanged: nothing to merge.
        report.unchanged.push(targetRel);
      } else {
        // Edited by a person and the generator wants something different: never overwrite.
        fs.writeFileSync(`${target}.minecode-new`, content, 'utf8');
        report.conflicts.push(targetRel);
      }
    }
    for (const rel of Object.keys(previous)) {
      const isMigration = rel.startsWith('supabase/migrations/');
      if (!produced.has(rel) && !isMigration && fs.existsSync(path.join(this.outDir, rel))) {
        report.orphaned.push(rel);
      }
    }

    // Format only the files written now, so files edited by a person are never touched.
    for (let i = 0; i < toFormat.length; i += 80) {
      try {
        const chunk = toFormat
          .slice(i, i + 80)
          .map((f) => `"${f}"`)
          .join(' ');
        execSync(`npx prettier --write ${chunk}`, { stdio: 'ignore' });
      } catch {
        // Formatting is best effort; the manifest hashes what is on disk either way.
      }
    }
    for (const rel of report.written) {
      records[rel].disk = sha256(fs.readFileSync(path.join(this.outDir, rel), 'utf8'));
    }

    lock.files = records;
    fs.writeFileSync(
      path.join(this.outDir, LOCK_FILE),
      JSON.stringify(lock, null, 2) + '\n',
      'utf8'
    );
    return report;
  }

  /** Where a generated (virtual) file lives inside the application directory. */
  private targetPath(relPath: string): string {
    if (
      relPath.startsWith('app/') ||
      relPath.startsWith('config/') ||
      relPath.startsWith('supabase/migrations/') ||
      ROOT_FILES.has(relPath)
    ) {
      return relPath;
    }
    return `generated/${relPath}`;
  }
}

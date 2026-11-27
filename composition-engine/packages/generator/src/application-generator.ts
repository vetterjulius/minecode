import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import {
  CompositionPlan,
  DEFAULT_STACK_ID,
  GeneratedFileRecord,
  SchemaLock,
  StackAdapter,
  StackRegistry,
  StackSupportError,
  createSnapshot,
  findMissingBehaviors,
} from '@minecode/core';
import { NextJsSupabaseAdapter } from '@minecode/nextjs-supabase';
import { OpenApiAdapter } from '@minecode/openapi';

/** Stacks that ship with Minecode. */
export function createDefaultStackRegistry(): StackRegistry {
  return new StackRegistry().register(new NextJsSupabaseAdapter()).register(new OpenApiAdapter());
}

export const LOCK_FILE = 'app.lock.json';

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

export class ApplicationGenerator {
  public readonly outDir: string;

  private readonly stacks: StackRegistry;

  constructor(outDir: string, stacks: StackRegistry = createDefaultStackRegistry()) {
    if (!outDir) {
      throw new Error('Output directory path must be specified.');
    }
    this.outDir = outDir;
    this.stacks = stacks;
  }

  public generate(
    plan: CompositionPlan,
    options?: { runnable?: boolean; force?: boolean }
  ): GenerationReport {
    if (!plan) {
      throw new Error('Composition plan must be specified.');
    }

    const adapter: StackAdapter = this.stacks.get(plan.stackId || DEFAULT_STACK_ID);
    const missing = findMissingBehaviors(plan, adapter);
    if (missing.length > 0) throw new StackSupportError(adapter.stackId, missing);

    fs.mkdirSync(this.outDir, { recursive: true });
    for (const dir of adapter.layout.skeleton.map((d) => path.join(this.outDir, d))) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

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
      migrationCount:
        (baseline?.migrationCount ?? 0) +
        Object.keys(virtualFiles).filter((f) =>
          adapter.layout.isMigration(adapter.layout.resolve(f))
        ).length,
    };
    const previous = baseline?.files ?? {};
    const report: GenerationReport = { written: [], unchanged: [], conflicts: [], orphaned: [] };
    // Entries of earlier generations stay (migrations are only emitted once).
    const records: Record<string, GeneratedFileRecord> = { ...previous };
    const toFormat: string[] = [];
    const produced = new Set<string>();

    for (const [relPath, content] of Object.entries(virtualFiles)) {
      const targetRel = adapter.layout.resolve(relPath);
      if (adapter.layout.isScaffold(targetRel)) {
        // Application code: scaffolded once, then owned by the developer. Not in the manifest.
        const scaffold = path.join(this.outDir, targetRel);
        if (fs.existsSync(scaffold)) {
          report.unchanged.push(targetRel);
        } else {
          fs.mkdirSync(path.dirname(scaffold), { recursive: true });
          fs.writeFileSync(scaffold, content, 'utf8');
          toFormat.push(scaffold);
          report.written.push(targetRel);
        }
        continue;
      }
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
      const isMigration = adapter.layout.isMigration(rel);
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
    for (const rel of report.written.filter((f) => !adapter.layout.isScaffold(f))) {
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
}

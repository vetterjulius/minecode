import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { CompositionPlan, SchemaLock, createSnapshot } from '@minecode/core';
import { NextJsSupabaseAdapter } from '@minecode/nextjs-supabase';

export const LOCK_FILE = 'app.lock.json';

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

  public generate(plan: CompositionPlan, options?: { runnable?: boolean }): void {
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
    fs.writeFileSync(
      path.join(this.outDir, LOCK_FILE),
      JSON.stringify(lock, null, 2) + '\n',
      'utf8'
    );

    for (const [relPath, content] of Object.entries(virtualFiles)) {
      let targetPath: string;

      if (relPath.startsWith('app/')) {
        targetPath = path.join(this.outDir, relPath);
      } else if (relPath.startsWith('config/')) {
        targetPath = path.join(this.outDir, relPath);
      } else if (relPath.startsWith('types/') || relPath.startsWith('components/')) {
        targetPath = path.join(this.outDir, 'generated', relPath);
      } else if (relPath.startsWith('supabase/migrations/')) {
        targetPath = path.join(this.outDir, relPath);
      } else if (
        relPath === 'package.json' ||
        relPath === 'tsconfig.json' ||
        relPath === 'postcss.config.js' ||
        relPath === 'tailwind.config.ts' ||
        relPath === 'next.config.mjs' ||
        relPath === '.env.local'
      ) {
        targetPath = path.join(this.outDir, relPath);
      } else {
        targetPath = path.join(this.outDir, 'generated', relPath);
      }

      const parentDir = path.dirname(targetPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(targetPath, content, 'utf8');
    }

    // Format the generated folder using Prettier to ensure 100% compliant formatting
    try {
      execSync(`npx prettier --write "${this.outDir}"`, { stdio: 'ignore' });
    } catch {
      // Ignore formatting errors if Prettier fails
    }
  }
}

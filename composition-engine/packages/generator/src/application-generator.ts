import * as fs from 'fs';
import * as path from 'path';
import { CompositionPlan } from '@minecode/core';
import { NextJsSupabaseAdapter } from '@minecode/nextjs-supabase';

export class ApplicationGenerator {
  public readonly outDir: string;

  constructor(outDir: string) {
    if (!outDir) {
      throw new Error('Output directory path must be specified.');
    }
    this.outDir = outDir;
  }

  public generate(plan: CompositionPlan): void {
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
    const virtualFiles = adapter.generate(plan);

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
      } else {
        targetPath = path.join(this.outDir, 'generated', relPath);
      }

      const parentDir = path.dirname(targetPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      fs.writeFileSync(targetPath, content, 'utf8');
    }
  }
}

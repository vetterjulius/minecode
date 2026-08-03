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

  /**
   * Generates a runnable project from a composition plan.
   * Handles skeleton directory creation, file generation, migrations output,
   * extension folders, and generated/config separation.
   */
  public generate(plan: CompositionPlan): void {
    if (!plan) {
      throw new Error('Composition plan must be specified.');
    }

    // 1. Output directory handling - Ensure root and skeleton directories exist
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

    // 2. Select the stack adapter based on plan.stackId
    const stackId = plan.stackId || 'nextjs-supabase';
    if (stackId !== 'nextjs-supabase') {
      throw new Error(`Unsupported stack ID: '${stackId}'.`);
    }

    const adapter = new NextJsSupabaseAdapter();
    const virtualFiles = adapter.generate(plan);

    // 3. File generation with separation of concerns (generated/config separation)
    for (const [relPath, content] of Object.entries(virtualFiles)) {
      let targetPath: string;

      if (relPath.startsWith('app/')) {
        // App router routes / pages go to app/
        targetPath = path.join(this.outDir, relPath);
      } else if (relPath.startsWith('config/')) {
        // Project glue/config goes to config/
        targetPath = path.join(this.outDir, relPath);
      } else if (relPath.startsWith('types/') || relPath.startsWith('components/')) {
        // Managed code goes to generated/
        targetPath = path.join(this.outDir, 'generated', relPath);
      } else if (relPath.startsWith('supabase/migrations/')) {
        // Migrations output
        targetPath = path.join(this.outDir, relPath);
      } else {
        // Fallback managed files go to generated/
        targetPath = path.join(this.outDir, 'generated', relPath);
      }

      // Ensure the parent directory of the file exists
      const parentDir = path.dirname(targetPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      // Write file content
      fs.writeFileSync(targetPath, content, 'utf8');
    }
  }
}

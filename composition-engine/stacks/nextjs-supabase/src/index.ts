import { StackAdapter, StackOutputLayout, CompositionPlan, SubGenerator } from '@minecode/core';
import { BEHAVIORS } from './generators/api/behaviors/index.js';
import { SupabaseDatabaseSubGenerator } from './generators/database/index.js';
import { NextjsSupabaseApiSubGenerator } from './generators/api.js';
import { NextjsSupabaseUiSubGenerator } from './generators/ui.js';
import { NextjsNavigationSubGenerator } from './generators/navigation.js';
import { NextjsWorkspaceSubGenerator } from './generators/workspace.js';
import { CommonEventsSubGenerator } from './generators/events.js';
import { CommonExtensionsSubGenerator } from './generators/extensions.js';

const ROOT_FILES = new Set([
  'package.json',
  'tsconfig.json',
  'postcss.config.js',
  'tailwind.config.ts',
  'next.config.mjs',
  '.env.local',
]);

/** Folders whose files keep their path; everything else is generated code under generated/. */
const PASS_THROUGH = ['app/', 'config/', 'supabase/migrations/', 'extensions/'];

export const nextjsSupabaseLayout: StackOutputLayout = {
  skeleton: ['app', 'generated', 'extensions', 'config'],
  resolve: (path) =>
    PASS_THROUGH.some((prefix) => path.startsWith(prefix)) || ROOT_FILES.has(path)
      ? path
      : `generated/${path}`,
  isScaffold: (path) => path.startsWith('extensions/'),
  isMigration: (path) => path.startsWith('supabase/migrations/'),
};

export class NextJsSupabaseAdapter implements StackAdapter {
  public readonly stackId = 'nextjs-supabase';
  public readonly description =
    'Next.js (App Router) with Supabase: Postgres schema, RLS, route handlers, pages';
  public readonly behaviors = Object.keys(BEHAVIORS);
  public readonly layout = nextjsSupabaseLayout;

  public readonly databaseGenerator = new SupabaseDatabaseSubGenerator();
  public readonly apiGenerator = new NextjsSupabaseApiSubGenerator();
  public readonly uiGenerator = new NextjsSupabaseUiSubGenerator();
  public readonly navigationGenerator = new NextjsNavigationSubGenerator();
  public readonly workspaceGenerator = new NextjsWorkspaceSubGenerator();
  public readonly eventsGenerator = new CommonEventsSubGenerator();
  public readonly extensionsGenerator = new CommonExtensionsSubGenerator();

  private subGenerators: SubGenerator[];

  constructor() {
    this.subGenerators = [
      this.databaseGenerator,
      this.apiGenerator,
      this.uiGenerator,
      this.navigationGenerator,
      this.workspaceGenerator,
      this.eventsGenerator,
      this.extensionsGenerator,
    ];
  }

  public registerSubGenerator(subGen: SubGenerator): void {
    this.subGenerators.push(subGen);
  }

  public getSubGenerators(): SubGenerator[] {
    return this.subGenerators;
  }

  public generate(plan: CompositionPlan, options?: { runnable?: boolean }): Record<string, string> {
    const files: Record<string, string> = {};

    for (const subGen of this.subGenerators) {
      const generated = subGen.generate(plan, options);
      Object.assign(files, generated);
    }

    return files;
  }
}

export * from './generators/database/index.js';
export * from './generators/api.js';
export * from './generators/ui.js';
export * from './generators/navigation.js';
export * from './generators/workspace.js';
export * from './generators/events.js';
export * from './generators/extensions.js';

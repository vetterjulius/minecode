import { StackAdapter, CompositionPlan, SubGenerator } from '@minecode/core';
import { SupabaseDatabaseSubGenerator } from './generators/database.js';
import { NextjsSupabaseApiSubGenerator } from './generators/api.js';
import { NextjsSupabaseUiSubGenerator } from './generators/ui.js';
import { NextjsNavigationSubGenerator } from './generators/navigation.js';
import { NextjsWorkspaceSubGenerator } from './generators/workspace.js';
import { CommonEventsSubGenerator } from './generators/events.js';
import { CommonExtensionsSubGenerator } from './generators/extensions.js';

export class NextJsSupabaseAdapter implements StackAdapter {
  public readonly stackId = 'nextjs-supabase';

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

export * from './generators/database.js';
export * from './generators/api.js';
export * from './generators/ui.js';
export * from './generators/navigation.js';
export * from './generators/workspace.js';
export * from './generators/events.js';
export * from './generators/extensions.js';

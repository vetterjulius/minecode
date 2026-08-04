import { StackAdapter, CompositionPlan, SubGenerator } from '@minecode/core';
import { BUILTIN_SUB_GENERATORS } from '@minecode/sub-generators';

export class NextJsSupabaseAdapter implements StackAdapter {
  public readonly stackId = 'nextjs-supabase';
  private subGenerators: SubGenerator[] = [];

  constructor(subGenerators?: SubGenerator[]) {
    if (subGenerators && subGenerators.length > 0) {
      this.subGenerators = [...subGenerators];
    } else {
      this.subGenerators = [...BUILTIN_SUB_GENERATORS];
    }
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

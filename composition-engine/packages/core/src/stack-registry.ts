import { CompositionPlan, StackAdapter } from './domain/types.js';

export const DEFAULT_STACK_ID = 'nextjs-supabase';

export class UnknownStackError extends Error {
  constructor(stackId: string, known: string[]) {
    super(`Unknown stack '${stackId}'. Available stacks: ${known.join(', ') || '(none)'}.`);
    this.name = 'UnknownStackError';
  }
}

/** Stacks known to this installation, by id. */
export class StackRegistry {
  private readonly adapters = new Map<string, StackAdapter>();

  public register(adapter: StackAdapter): this {
    if (this.adapters.has(adapter.stackId)) {
      throw new Error(`Stack '${adapter.stackId}' is already registered`);
    }
    this.adapters.set(adapter.stackId, adapter);
    return this;
  }

  public get(stackId: string): StackAdapter {
    const adapter = this.adapters.get(stackId || DEFAULT_STACK_ID);
    if (!adapter)
      throw new UnknownStackError(
        stackId,
        this.list().map((a) => a.stackId)
      );
    return adapter;
  }

  public list(): StackAdapter[] {
    return [...this.adapters.values()].sort((a, b) => a.stackId.localeCompare(b.stackId));
  }
}

export interface MissingBehavior {
  apiId: string;
  featureId: string;
  behavior: string;
}

/** Behaviors named by the plan that the stack does not implement. */
export function findMissingBehaviors(
  plan: CompositionPlan,
  adapter: StackAdapter
): MissingBehavior[] {
  if (adapter.behaviors === '*') return [];
  const supported = new Set(adapter.behaviors);
  return plan.api
    .filter((a) => a.behavior && !supported.has(a.behavior))
    .map((a) => ({ apiId: a.id, featureId: a.featureId, behavior: a.behavior as string }));
}

export class StackSupportError extends Error {
  constructor(
    public readonly stackId: string,
    public readonly missing: MissingBehavior[]
  ) {
    super(
      `Stack '${stackId}' does not implement behaviors required by the selected features:\n` +
        missing
          .map((m) => `  - '${m.behavior}' (feature '${m.featureId}', API '${m.apiId}')`)
          .join('\n') +
        `\nChoose a stack that implements them or remove the features.`
    );
    this.name = 'StackSupportError';
  }
}

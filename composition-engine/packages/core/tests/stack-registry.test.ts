import { describe, expect, it } from 'vitest';
import {
  CompositionPlan,
  StackAdapter,
  StackRegistry,
  StackSupportError,
  UnknownStackError,
  findMissingBehaviors,
} from '../src/index.js';

const adapter = (stackId: string, behaviors: readonly string[] | '*'): StackAdapter => ({
  stackId,
  description: stackId,
  behaviors,
  layout: { skeleton: [], resolve: (p) => p, isScaffold: () => false, isMigration: () => false },
  generate: () => ({}),
});

const plan = {
  api: [
    { id: 'a', featureId: 'f1', behavior: 'x.do' },
    { id: 'b', featureId: 'f2', crud: { entity: 'E', operation: 'list' } },
  ],
} as unknown as CompositionPlan;

describe('StackRegistry', () => {
  it('registers, lists sorted and rejects duplicates', () => {
    const r = new StackRegistry().register(adapter('b', '*')).register(adapter('a', '*'));
    expect(r.list().map((s) => s.stackId)).toEqual(['a', 'b']);
    expect(() => r.register(adapter('a', '*'))).toThrow(/already registered/);
  });

  it('throws a helpful error for unknown stacks', () => {
    const r = new StackRegistry().register(adapter('a', '*'));
    expect(() => r.get('zzz')).toThrow(UnknownStackError);
    expect(() => r.get('zzz')).toThrow(/Available stacks: a/);
  });
});

describe('behavior support', () => {
  it('reports behaviors the stack lacks, naming the feature', () => {
    const missing = findMissingBehaviors(plan, adapter('s', ['other']));
    expect(missing).toEqual([{ apiId: 'a', featureId: 'f1', behavior: 'x.do' }]);
    expect(new StackSupportError('s', missing).message).toMatch(/'x\.do' \(feature 'f1'/);
  });

  it('accepts everything with "*" and implemented behaviors', () => {
    expect(findMissingBehaviors(plan, adapter('s', '*'))).toEqual([]);
    expect(findMissingBehaviors(plan, adapter('s', ['x.do']))).toEqual([]);
  });
});

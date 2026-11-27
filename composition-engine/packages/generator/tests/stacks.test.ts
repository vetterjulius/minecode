import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  StackSupportError,
  StackRegistry,
  type CompositionPlan,
  type StackAdapter,
} from '@minecode/core';
import { ApplicationGenerator, createDefaultStackRegistry } from '../src/index.js';

const plan = {
  applicationName: 'Demo',
  stackId: 'openapi',
  database: [],
  api: [],
  ui: [],
  navigation: [],
  events: [],
  permissions: [],
  migrations: [],
  extensionPoints: [],
} as unknown as CompositionPlan;

describe('stack-agnostic generator', () => {
  it('lists both shipped stacks', () => {
    expect(
      createDefaultStackRegistry()
        .list()
        .map((s) => s.stackId)
    ).toEqual(['nextjs-supabase', 'openapi']);
  });

  it('writes only what the stack layout says (no skeleton, no migrations)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-oa-'));
    new ApplicationGenerator(dir).generate(plan);
    expect(fs.readdirSync(dir).sort()).toEqual(['app.lock.json', 'openapi.json']);
  });

  it('refuses plans needing behaviors the stack lacks, before writing anything', () => {
    const limited: StackAdapter = {
      ...createDefaultStackRegistry().get('openapi'),
      stackId: 'limited',
      behaviors: ['only.this'],
      generate: () => ({}),
    };
    const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mc-lim-')), 'out');
    const p = {
      ...plan,
      stackId: 'limited',
      api: [{ id: 'a', featureId: 'f', name: 'n', path: '/x', behavior: 'nope' }],
    };
    const gen = new ApplicationGenerator(dir, new StackRegistry().register(limited));
    expect(() => gen.generate(p as unknown as CompositionPlan)).toThrow(StackSupportError);
    expect(fs.existsSync(dir)).toBe(false);
  });
});

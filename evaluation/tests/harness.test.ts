import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error plain ESM modules without type declarations
import { hashWorkspace } from '../harness/lib/files.mjs';
// @ts-expect-error plain ESM modules without type declarations
import { runDatabaseOracles } from '../harness/lib/db-oracles.mjs';
// @ts-expect-error plain ESM modules without type declarations
import { scanSecrets } from '../harness/lib/secrets.mjs';
// @ts-expect-error plain ESM modules without type declarations
import { diffWorkspaces } from '../harness/lib/diff.mjs';
// @ts-expect-error plain ESM modules without type declarations
import { newRecord, validateRecord } from '../harness/lib/record.mjs';
// @ts-expect-error plain ESM modules without type declarations
import { validateTaskObject } from '../harness/lib/task.mjs';
// @ts-expect-error plain ESM modules without type declarations
import { bootstrapMeanCI, pairedComparison, wilcoxonSignedRank } from '../harness/lib/stats.mjs';
// @ts-expect-error plain ESM modules without type declarations
import { analyzeRecords } from '../harness/lib/analyze.mjs';
// @ts-expect-error plain ESM modules without type declarations
import { scoreWorkspace } from '../harness/lib/score.mjs';

function workspace(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-eval-'));
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

const GOOD_SQL = `
CREATE TABLE notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner uuid NOT NULL, body text);
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY own ON notes USING (owner = auth.uid()) WITH CHECK (owner = auth.uid());
`;
const BAD_SQL = `
CREATE TABLE notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner uuid NOT NULL, body text);
CREATE TABLE audit (id serial PRIMARY KEY);
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY everyone ON notes FOR SELECT USING (true);
`;

describe('workspace hash', () => {
  test('test_HashWorkspace_SameContentDifferentOrder_IsEqualAndIgnoresDependencies', () => {
    const a = workspace({ 'a.txt': '1', 'b/c.txt': '2', 'node_modules/x/index.js': 'big' });
    const b = workspace({ 'b/c.txt': '2', 'a.txt': '1' });
    expect(hashWorkspace(a)).toBe(hashWorkspace(b));
    fs.writeFileSync(path.join(b, 'a.txt'), 'changed');
    expect(hashWorkspace(a)).not.toBe(hashWorkspace(b));
  });
});

describe('database oracles (layout independent)', () => {
  test('test_RunDatabaseOracles_WellProtectedSchema_AppliesWithoutFindings', async () => {
    const ws = workspace({ 'db/anything/001.sql': GOOD_SQL });
    const result = await runDatabaseOracles(ws);
    expect(result.migrationsApply).toBe(true);
    expect(result.security.tablesWithoutRls).toEqual([]);
    expect(result.security.openPolicies).toEqual([]);
  });

  test('test_RunDatabaseOracles_MissingRlsAndOpenPolicy_AreReported', async () => {
    const ws = workspace({ 'schema.sql': BAD_SQL });
    const result = await runDatabaseOracles(ws);
    expect(result.security.tablesWithoutRls).toEqual(['audit']);
    expect(result.security.openPolicies).toEqual(['notes.everyone (SELECT)']);
  });

  test('test_RunDatabaseOracles_BrokenSql_FailsWithFile', async () => {
    const ws = workspace({ 'a.sql': GOOD_SQL, 'b.sql': 'CREATE TABEL oops (' });
    const result = await runDatabaseOracles(ws);
    expect(result.migrationsApply).toBe(false);
    expect(result.migrationFailures[0].file).toBe('b.sql');
  });

  test('test_RunDatabaseOracles_NoSql_IsNotApplied', async () => {
    const result = await runDatabaseOracles(workspace({ 'x.ts': '' }));
    expect(result.migrationsApply).toBe(false);
  });
});

describe('secrets scan', () => {
  test('test_ScanSecrets_RealLookingKeys_FoundPlaceholdersIgnored', () => {
    const ws = workspace({
      'src/a.ts': `const k = 'sk_live_${'a1'.repeat(12)}';`,
      '.env.local': 'STRIPE_SECRET_KEY=sk_test_your-secret-key\nOPENAI_API_KEY=your-openai-key\n',
      'src/b.ts': 'export const ok = 1;',
    });
    expect(scanSecrets(ws)).toEqual([{ rule: 'stripe-live-key', file: 'src/a.ts' }]);
  });
});

describe('follow-up diff', () => {
  test('test_DiffWorkspaces_AddedAndChangedLines_AreCounted', () => {
    const before = workspace({ 'a.ts': 'one\ntwo\n', 'keep.ts': 'same\n' });
    const after = workspace({ 'a.ts': 'one\nTWO\nthree\n', 'keep.ts': 'same\n', 'new.ts': 'x\n' });
    expect(diffWorkspaces(before, after)).toEqual({ diffLines: 4, filesTouched: 2 });
  });
  test('test_DiffWorkspaces_Identical_IsZero', () => {
    const a = workspace({ 'a.ts': 'x\n' });
    expect(diffWorkspaces(a, a)).toEqual({ diffLines: 0, filesTouched: 0 });
  });
});

describe('run records', () => {
  const base = () =>
    newRecord({
      task: 't01',
      condition: 'B',
      tool: 'tool',
      model: 'm',
      limits: { turns: 10, minutes: 60 },
    });

  test('test_ValidateRecord_FreshRecord_IsValid', () => {
    expect(validateRecord(base())).toEqual([]);
  });

  test('test_ValidateRecord_Inconsistent_ListsProblems', () => {
    const r = base();
    r.condition = 'Z';
    r.oracles.acceptancePassed = 5;
    r.oracles.acceptanceTotal = 3;
    r.artifactSha256 = 'nothex';
    const problems = validateRecord(r).join('\n');
    expect(problems).toMatch(/condition must be/);
    expect(problems).toMatch(/cannot exceed/);
    expect(problems).toMatch(/sha256/);
  });

  test('test_ScoreWorkspace_FillsOraclesAndLeavesUnmeasuredNull', async () => {
    const ws = workspace({
      'schema.sql': BAD_SQL,
      'src/a.ts': `const k = 'sk_live_${'b2'.repeat(12)}';`,
    });
    const scored = await scoreWorkspace(base(), ws);
    expect(validateRecord(scored)).toEqual([]);
    expect(scored.oracles.migrationsApply).toBe(true);
    expect(scored.oracles.securityFindings).toBe(3); // no-RLS table + open policy + secret
    expect(scored.oracles.builds).toBeNull();
    expect(scored.oracles.tenantLeaks).toBeNull();
    expect(scored.artifactSha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('task validation', () => {
  const ok = {
    id: 't01',
    tier: 'in-catalog',
    requirement: 'A small team needs to track support tickets for several customers.',
    followUp: 'Customers should also be able to attach files to a ticket.',
    limits: { turns: 10, minutes: 60 },
  };
  test('test_ValidateTask_Valid_NoProblems', () => {
    expect(validateTaskObject(ok)).toEqual([]);
  });
  test('test_ValidateTask_MinecodeVocabulary_IsRejected', () => {
    const problems = validateTaskObject({
      ...ok,
      requirement: 'Write a blueprint with the billing feature id.',
    });
    expect(problems.join()).toMatch(/blueprint/);
  });
  test('test_ValidateTask_BadTierAndLimits_AreRejected', () => {
    const problems = validateTaskObject({
      ...ok,
      tier: 'x',
      limits: { turns: 0, minutes: 1.5 },
    }).join();
    expect(problems).toMatch(/tier/);
    expect(problems).toMatch(/turns/);
    expect(problems).toMatch(/minutes/);
  });
});

describe('statistics', () => {
  test('test_Wilcoxon_AllPositiveFive_MatchesExactValue', () => {
    // n=5, W+=15: only 2 of 32 sign patterns are this extreme -> p = 0.0625
    const r = wilcoxonSignedRank([1, 2, 3, 4, 5]);
    expect(r.wPlus).toBe(15);
    expect(r.p).toBeCloseTo(0.0625, 10);
  });
  test('test_Wilcoxon_Symmetric_HasPOne', () => {
    expect(wilcoxonSignedRank([1, -1, 2, -2]).p).toBe(1);
  });
  test('test_Wilcoxon_OnlyZeros_HasPOne', () => {
    expect(wilcoxonSignedRank([0, 0])).toEqual({ n: 0, wPlus: 0, p: 1 });
  });
  test('test_BootstrapCI_IsDeterministicAndContainsMean', () => {
    const diffs = [0.2, 0.4, 0.1, 0.5, 0.3];
    const a = bootstrapMeanCI(diffs, { seed: 7 });
    expect(bootstrapMeanCI(diffs, { seed: 7 })).toEqual(a);
    expect(a.low).toBeLessThanOrEqual(a.mean);
    expect(a.high).toBeGreaterThanOrEqual(a.mean);
  });
  test('test_PairedComparison_AveragesRunsPerTaskAndSkipsUnpaired', () => {
    const rec = (task: string, condition: string, v: number) => ({ task, condition, v });
    const records = [rec('t1', 'A', 0), rec('t1', 'A', 1), rec('t1', 'B', 1), rec('t2', 'B', 1)];
    const r = pairedComparison(records, 'A', 'B', (x: { v: number }) => x.v);
    expect(r.tasks).toBe(1); // t2 has no A runs
    expect(r.diffs).toEqual([0.5]);
  });
  test('test_AnalyzeRecords_SeparatesToolsAndComparesTreatment', () => {
    const rec = (tool: string, task: string, condition: string, builds: boolean) => {
      const r = newRecord({ task, condition, tool, model: 'm', limits: { turns: 1, minutes: 1 } });
      r.oracles.builds = builds;
      return r;
    };
    const records = [
      rec('x', 't1', 'A', false),
      rec('x', 't1', 'B', true),
      rec('x', 't2', 'A', true),
      rec('x', 't2', 'B', true),
      rec('y', 't1', 'A', true),
    ];
    const result = analyzeRecords(records, { treatment: 'B', options: { iterations: 200 } });
    expect(result.map((t: { tool: string }) => t.tool)).toEqual(['x', 'y']);
    expect(result[0].descriptive.A.builds).toBe(0.5);
    expect(result[0].comparisons['B vs A'].builds.diffs).toEqual([1, 0]);
    expect(result[1].comparisons).toEqual({}); // tool y has no treatment runs
  });
});

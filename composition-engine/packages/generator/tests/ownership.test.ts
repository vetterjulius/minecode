import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { CompositionPlan, DatabaseArtifact } from '@minecode/core';
import { ApplicationGenerator, readLock } from '../src/application-generator.js';

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-ownership-'));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const id = { name: 'id', type: 'uuid', required: true, generate: 'uuid' as const };
const note = (extra: DatabaseArtifact['fields'] = []): DatabaseArtifact => ({
  id: 'n:Note',
  featureId: 'n',
  entityName: 'Note',
  access: { scope: 'authenticated-read' },
  fields: [id, { name: 'title', type: 'string', required: true }, ...extra],
});

function plan(database: DatabaseArtifact[], appName = 'Owned'): CompositionPlan {
  return {
    applicationName: appName,
    stackId: 'nextjs-supabase',
    database,
    api: [],
    ui: [],
    navigation: [],
    events: [],
    permissions: [],
    migrations: [],
    extensionPoints: [],
  };
}

const run = (p: CompositionPlan, force = false) =>
  new ApplicationGenerator(dir).generate(p, { runnable: true, force });
const file = (rel: string) => path.join(dir, rel);
// Changes with the application name, so a second generation wants a different version.
const LAYOUT = 'app/layout.tsx';

describe('ownership manifest', () => {
  test('test_Generate_FirstRun_RecordsEveryWrittenFileInManifest', () => {
    const report = run(plan([note()]));
    const recorded = Object.keys(readLock(dir)?.files ?? {});
    expect(recorded.sort()).toEqual([...report.written].sort());
    expect(report.conflicts).toEqual([]);
  });

  test('test_Generate_SecondRunUnchanged_WritesNothing', () => {
    run(plan([note()]));
    const report = run(plan([note()]));
    expect(report.written).toEqual([]);
    expect(report.conflicts).toEqual([]);
  });

  test('test_Generate_UneditedFileWithNewGeneratorOutput_IsOverwritten', () => {
    run(plan([note()], 'First'));
    const report = run(plan([note()], 'Second'));
    expect(report.written).toContain(LAYOUT);
    expect(fs.readFileSync(file(LAYOUT), 'utf8')).toContain('Second');
  });

  test('test_Generate_EditedFileWithNewGeneratorOutput_KeepsEditAndSavesProposal', () => {
    run(plan([note()], 'First'));
    fs.appendFileSync(file(LAYOUT), '\n// my custom change\n');
    const report = run(plan([note()], 'Second'));
    expect(report.conflicts).toEqual([LAYOUT]);
    expect(fs.readFileSync(file(LAYOUT), 'utf8')).toContain('my custom change');
    expect(fs.readFileSync(file(LAYOUT), 'utf8')).toContain('First');
    expect(fs.readFileSync(`${file(LAYOUT)}.minecode-new`, 'utf8')).toContain('Second');
  });

  test('test_Generate_EditedFileWithUnchangedGeneratorOutput_IsLeftAloneWithoutConflict', () => {
    run(plan([note()]));
    fs.appendFileSync(file(LAYOUT), '\n// my custom change\n');
    const report = run(plan([note()]));
    expect(report.conflicts).toEqual([]);
    expect(fs.readFileSync(file(LAYOUT), 'utf8')).toContain('my custom change');
  });

  test('test_Generate_ConflictPersists_UntilPersonResolvesIt', () => {
    run(plan([note()], 'First'));
    fs.appendFileSync(file(LAYOUT), '\n// mine\n');
    run(plan([note()], 'Second'));
    expect(run(plan([note()], 'Second')).conflicts).toEqual([LAYOUT]);
  });

  test('test_Generate_Force_OverwritesEditedFile', () => {
    run(plan([note()], 'First'));
    fs.appendFileSync(file(LAYOUT), '\n// mine\n');
    run(plan([note()], 'Second'), true);
    expect(fs.readFileSync(file(LAYOUT), 'utf8')).not.toContain('mine');
  });

  test('test_Generate_DeletedFileWithUnchangedOutput_StaysDeleted', () => {
    run(plan([note()]));
    fs.rmSync(file(LAYOUT));
    run(plan([note()]));
    expect(fs.existsSync(file(LAYOUT))).toBe(false);
  });

  test('test_Generate_ExistingFileWithoutManifestEntry_IsTreatedAsEdited', () => {
    fs.mkdirSync(path.dirname(file(LAYOUT)), { recursive: true });
    fs.writeFileSync(file(LAYOUT), 'hand written\n');
    const report = run(plan([note()]));
    expect(report.conflicts).toContain(LAYOUT);
    expect(fs.readFileSync(file(LAYOUT), 'utf8')).toBe('hand written\n');
  });

  test('test_Generate_UserFilesOutsideGeneratedOutput_AreNeverTouched', () => {
    fs.mkdirSync(file('extensions'), { recursive: true });
    fs.writeFileSync(file('extensions/custom.ts'), 'export const mine = 1;\n');
    run(plan([note()]));
    run(plan([note([{ name: 'body', type: 'string', required: false }])]));
    expect(fs.readFileSync(file('extensions/custom.ts'), 'utf8')).toBe('export const mine = 1;\n');
  });

  test('test_Generate_EvolutionKeepsEarlierMigrationsInManifest', () => {
    run(plan([note()]));
    const before = Object.keys(readLock(dir)?.files ?? {}).filter((f) => f.includes('migrations'));
    run(plan([note([{ name: 'body', type: 'string', required: false }])]));
    const after = Object.keys(readLock(dir)?.files ?? {}).filter((f) => f.includes('migrations'));
    expect(after).toEqual(expect.arrayContaining(before));
    expect(after.length).toBeGreaterThan(before.length);
  });

  test('test_Generate_FormattingDoesNotCountAsUserEdit', () => {
    run(plan([note()]));
    const report = run(plan([note()]));
    expect(report.conflicts).toEqual([]);
    expect(report.written).toEqual([]);
  });

  test('test_Generate_ExtensionsScaffold_IsCreatedOnceAndNeverOverwritten', () => {
    const withHook = (): CompositionPlan => ({
      ...plan([note()]),
      extensionPoints: [
        {
          id: 'n:Note.beforeCreate',
          featureId: 'n',
          name: 'Note.beforeCreate',
          type: 'function',
          description: '',
          contributions: [],
        },
      ],
    });
    const first = run(withHook());
    expect(first.written).toContain('extensions/index.ts');
    expect(fs.readFileSync(file('extensions/index.ts'), 'utf8')).toMatch(
      /["']Note\.beforeCreate["']/
    );

    fs.writeFileSync(file('extensions/index.ts'), 'export const extensions = { mine: true };\n');
    const second = run(withHook());
    expect(second.written).not.toContain('extensions/index.ts');
    expect(second.conflicts).toEqual([]);
    expect(fs.readFileSync(file('extensions/index.ts'), 'utf8')).toContain('mine: true');
    expect(Object.keys(readLock(dir)?.files ?? {})).not.toContain('extensions/index.ts');
    expect(fs.readFileSync(file('generated/lib/extensions.ts'), 'utf8')).toMatch(
      /["']Note\.beforeCreate["']\?: BeforeCreateHook/
    );
  });
});

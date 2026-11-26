import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { CompositionPlan, DatabaseArtifact, SchemaChangeBlockedError } from '@minecode/core';
import { ApplicationGenerator, LOCK_FILE, readLock } from '../src/application-generator.js';
import {
  applyMigrations,
  createSupabaseLikeDb,
  listMigrationFiles,
} from '../../../stacks/nextjs-supabase/tests/support/supabase-db.js';

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minecode-evolution-'));
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
const tag: DatabaseArtifact = {
  id: 'n:Tag',
  featureId: 'n',
  entityName: 'Tag',
  access: { scope: 'authenticated-read' },
  fields: [id, { name: 'noteId', type: 'uuid', required: true, references: { entity: 'Note' } }],
};

function plan(database: DatabaseArtifact[]): CompositionPlan {
  return {
    applicationName: 'Evolving',
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

const generate = (database: DatabaseArtifact[]) =>
  new ApplicationGenerator(dir).generate(plan(database), { runnable: false });
const migrationDir = () => path.join(dir, 'supabase/migrations');
const names = () => listMigrationFiles(migrationDir());
const snapshotFiles = () =>
  Object.fromEntries(
    names().map((f) => [f, fs.readFileSync(path.join(migrationDir(), f), 'utf8')])
  );

describe('schema evolution with app.lock.json', () => {
  test('test_Generate_FirstRun_WritesLockWithMigrationCount', () => {
    generate([note()]);
    const lock = readLock(dir);
    expect(lock?.migrationCount).toBe(names().length);
    expect(Object.keys(lock?.schema.entities ?? {})).toEqual(['Note']);
  });

  test('test_Generate_SecondRunWithoutChanges_AddsNoMigrationsAndKeepsFilesIdentical', () => {
    generate([note()]);
    const before = snapshotFiles();
    const lockBefore = fs.readFileSync(path.join(dir, LOCK_FILE), 'utf8');
    generate([note()]);
    expect(snapshotFiles()).toEqual(before);
    expect(fs.readFileSync(path.join(dir, LOCK_FILE), 'utf8')).toBe(lockBefore);
  });

  test('test_Generate_NewEntityAndField_AddsOnlyNewMigrationsAndKeepsOldOnesUntouched', () => {
    generate([note()]);
    const oldFiles = names();
    const oldContent = fs.readFileSync(path.join(migrationDir(), oldFiles[0]), 'utf8');

    generate([note([{ name: 'body', type: 'string', required: false }]), tag]);
    const all = names();
    const added = all.filter((f) => !oldFiles.includes(f));

    expect(all.slice(0, oldFiles.length)).toEqual(oldFiles);
    expect(fs.readFileSync(path.join(migrationDir(), oldFiles[0]), 'utf8')).toBe(oldContent);
    expect(added.some((f) => f.includes('add_columns_note'))).toBe(true);
    expect(added.some((f) => f.includes('create_tag'))).toBe(true);
    expect(added.every((f) => f > oldFiles[oldFiles.length - 1])).toBe(true);
  });

  test('test_Generate_Evolution_AppliesCleanlyOnTopOfExistingDatabaseWithData', async () => {
    generate([note()]);
    const db = await createSupabaseLikeDb();
    expect(await applyMigrations(db, migrationDir())).toEqual([]);
    await db.exec(`INSERT INTO note (title) VALUES ('keep me')`);

    const applied = names();
    generate([note([{ name: 'body', type: 'string', required: false }]), tag]);
    // Like a real migration runner: only files that have not been applied yet.
    for (const file of names().filter((f) => !applied.includes(f))) {
      await db.exec(fs.readFileSync(path.join(migrationDir(), file), 'utf8'));
    }

    const { rows } = await db.query<{ title: string; body: string | null }>(
      'SELECT title, body FROM note'
    );
    expect(rows).toEqual([{ title: 'keep me', body: null }]);
    await db.exec(`INSERT INTO tag (note_id) SELECT id FROM note`);
  }, 60000);

  test('test_Generate_RemovedField_ThrowsAndLeavesFilesAndLockUntouched', () => {
    generate([note([{ name: 'body', type: 'string', required: false }])]);
    const lockBefore = fs.readFileSync(path.join(dir, LOCK_FILE), 'utf8');
    const filesBefore = names();
    expect(() => generate([note()])).toThrow(SchemaChangeBlockedError);
    expect(fs.readFileSync(path.join(dir, LOCK_FILE), 'utf8')).toBe(lockBefore);
    expect(names()).toEqual(filesBefore);
  });

  test('test_Generate_NewRequiredFieldWithoutDefault_ThrowsWithActionableMessage', () => {
    generate([note()]);
    expect(() => generate([note([{ name: 'state', type: 'string', required: true }])])).toThrow(
      /needs a default or must be optional/
    );
  });
});

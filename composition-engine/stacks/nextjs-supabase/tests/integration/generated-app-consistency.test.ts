import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { applyMigrations, createSupabaseLikeDb } from '../support/supabase-db.js';
import {
  extractFetchUsages,
  extractTableUsages,
  listApiRoutes,
  listSourceFiles,
  topLevelKeys,
} from '../support/static-usage.js';

const EXAMPLES = path.resolve(__dirname, '../../../../examples');
const APPS = ['ai-workspace', 'b2b-saas'];

async function loadColumns(db: PGlite): Promise<Map<string, Set<string>>> {
  const { rows } = await db.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
  );
  const tables = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!tables.has(row.table_name)) tables.set(row.table_name, new Set());
    tables.get(row.table_name)?.add(row.column_name);
  }
  return tables;
}

describe('static usage extraction', () => {
  test('test_TopLevelKeys_ObjectWithNestedAndShorthand_ReturnsOnlyTopLevelKeys', () => {
    expect(topLevelKeys('{ a: 1, b, nested: { c: 2 }, d: fn(x, y), e }')).toEqual([
      'a',
      'b',
      'nested',
      'd',
      'e',
    ]);
  });

  test('test_TopLevelKeys_ValuesAreIdentifiers_AreNotReportedAsKeys', () => {
    expect(topLevelKeys('{ title: t, projectId: p, flag }')).toEqual([
      'title',
      'projectId',
      'flag',
    ]);
  });

  test('test_TopLevelKeys_ValueIsStringContainingCommaAndColon_IsIgnored', () => {
    expect(topLevelKeys(`{ a: 'x, y: z', b: 1 }`)).toEqual(['a', 'b']);
  });

  test('test_ExtractTableUsages_ChainWithFilterSelectAndInsert_CollectsAllColumns', () => {
    const src = `const r = await supabase.from('task').select('id, title').eq('project_id', p).order('created_at');
      await supabase.from('task').insert({ title: t, projectId: p });`;
    const [first, second] = extractTableUsages('f.ts', src);
    expect(first.columns.map((c) => c.name)).toEqual(['project_id', 'created_at', 'id', 'title']);
    expect(second.columns.map((c) => c.name)).toEqual(['title', 'projectId']);
  });

  test('test_ExtractTableUsages_StorageBucketFrom_IsNotATable', () => {
    expect(
      extractTableUsages('f.ts', `await supabase.storage.from('files').upload(a, b);`)
    ).toEqual([]);
  });

  test('test_ExtractTableUsages_ColumnInNextStatement_IsNotAttributedToPreviousTable', () => {
    const src = `await supabase.from('a').select('id');\nawait supabase.from('b').eq('zzz', 1);`;
    const [a] = extractTableUsages('f.ts', src);
    expect(a.columns.map((c) => c.name)).toEqual(['id']);
  });

  test('test_ExtractFetchUsages_PostWithMethodOption_ReturnsPost', () => {
    const src = "await fetch('/api/tasks', { method: 'POST', body: x });";
    expect(extractFetchUsages('f.tsx', src)).toEqual([
      { file: 'f.tsx', url: '/api/tasks', method: 'POST' },
    ]);
  });

  test('test_ExtractFetchUsages_PlainFetch_DefaultsToGet', () => {
    expect(extractFetchUsages('f.tsx', "const r = await fetch('/api/tasks');")[0].method).toBe(
      'GET'
    );
  });
});

describe.each(APPS)('generated app %s matches its generated database', (app) => {
  const root = path.join(EXAMPLES, app);
  let columns: Map<string, Set<string>>;

  beforeAll(async () => {
    const db = await createSupabaseLikeDb();
    expect(await applyMigrations(db, path.join(root, 'supabase/migrations'))).toEqual([]);
    columns = await loadColumns(db);
  });

  const usages = () =>
    listSourceFiles(root).flatMap((file) =>
      extractTableUsages(path.relative(root, file), fs.readFileSync(file, 'utf8'))
    );

  test('test_GeneratedCode_TablesReferenced_AllExistInSchema', () => {
    const missing = usages()
      .filter((u) => !columns.has(u.table))
      .map((u) => `${u.file}: table '${u.table}'`);
    expect([...new Set(missing)]).toEqual([]);
  });

  test('test_GeneratedCode_ColumnsReferenced_AllExistOnTheirTable', () => {
    const missing = usages()
      .filter((u) => columns.has(u.table))
      .flatMap((u) =>
        u.columns
          .filter((c) => !columns.get(u.table)?.has(c.name))
          .map((c) => `${u.file}: ${u.table}.${c.name} (${c.via})`)
      );
    expect([...new Set(missing)]).toEqual([]);
  });

  test('test_GeneratedCode_FetchTargets_ExistWithRequestedMethod', () => {
    const routes = listApiRoutes(root);
    const problems = listSourceFiles(root).flatMap((file) =>
      extractFetchUsages(path.relative(root, file), fs.readFileSync(file, 'utf8'))
        .filter((u) => !routes.get(u.url)?.includes(u.method))
        .map((u) => `${u.file}: ${u.method} ${u.url}`)
    );
    expect([...new Set(problems)]).toEqual([]);
  });

  test('test_GeneratedCode_ClientComponents_NeverReferenceServiceRoleKeyOrAdminClient', () => {
    const offenders = listSourceFiles(root)
      .map((file) => ({ file: path.relative(root, file), source: fs.readFileSync(file, 'utf8') }))
      .filter(({ source }) => /^\s*['"]use client['"]/.test(source))
      .filter(({ source }) => /SERVICE_ROLE|supabase\/admin|createAdminClient/.test(source))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  test('test_GeneratedEnvTemplate_ServiceRoleKey_IsNotPublicPrefixed', () => {
    const env = fs.readFileSync(path.join(root, '.env.local'), 'utf8');
    expect(env).toContain('SUPABASE_SERVICE_ROLE_KEY=');
    expect(env).not.toContain('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
  });
});

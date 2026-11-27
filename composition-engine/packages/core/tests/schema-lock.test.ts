import { describe, expect, test } from 'vitest';
import { DatabaseArtifact } from '../src/domain/types.js';
import { createSnapshot, diffSnapshots } from '../src/schema-lock.js';

const entity = (name: string, fields: DatabaseArtifact['fields']): DatabaseArtifact => ({
  id: name,
  featureId: 'f',
  entityName: name,
  fields,
});

const id = { name: 'id', type: 'uuid', required: true, generate: 'uuid' as const };
const snap = (entities: DatabaseArtifact[], perms: string[] = []) =>
  createSnapshot(
    entities,
    perms.map((name) => ({ name })),
    []
  );

describe('diffSnapshots', () => {
  const base = snap([entity('Note', [id, { name: 'title', type: 'string', required: true }])]);

  test('test_Diff_Identical_NoChanges', () => {
    expect(diffSnapshots(base, base)).toEqual({ changes: [], blocked: [] });
  });

  test('test_Diff_DescriptionOnlyChange_IsIgnored', () => {
    const next = snap([
      entity('Note', [id, { name: 'title', type: 'string', required: true, description: 'new' }]),
    ]);
    expect(diffSnapshots(base, next).changes).toEqual([]);
  });

  test('test_Diff_NewEntity_IsAdditive', () => {
    const next = snap([
      entity('Note', [id, { name: 'title', type: 'string', required: true }]),
      entity('Tag', [id]),
    ]);
    expect(diffSnapshots(base, next).changes).toEqual([{ kind: 'add-entity', entity: 'Tag' }]);
  });

  test('test_Diff_NewOptionalField_IsAdditive', () => {
    const next = snap([
      entity('Note', [
        id,
        { name: 'title', type: 'string', required: true },
        { name: 'body', type: 'string', required: false },
      ]),
    ]);
    expect(diffSnapshots(base, next).changes).toEqual([
      { kind: 'add-field', entity: 'Note', field: 'body' },
    ]);
  });

  test('test_Diff_NewRequiredFieldWithDefault_IsAdditive', () => {
    const next = snap([
      entity('Note', [
        id,
        { name: 'title', type: 'string', required: true },
        { name: 'state', type: 'string', required: true, default: 'open' },
      ]),
    ]);
    const diff = diffSnapshots(base, next);
    expect(diff.blocked).toEqual([]);
    expect(diff.changes).toHaveLength(1);
  });

  test('test_Diff_NewRequiredFieldWithoutDefault_IsBlocked', () => {
    const next = snap([
      entity('Note', [
        id,
        { name: 'title', type: 'string', required: true },
        { name: 'state', type: 'string', required: true },
      ]),
    ]);
    expect(diffSnapshots(base, next).blocked[0]).toMatchObject({
      kind: 'unsafe-add-field',
      field: 'state',
    });
  });

  test('test_Diff_RemovedEntity_IsBlocked', () => {
    expect(diffSnapshots(base, snap([])).blocked[0].kind).toBe('remove-entity');
  });

  test('test_Diff_RemovedField_IsBlocked', () => {
    const next = snap([entity('Note', [id])]);
    expect(diffSnapshots(base, next).blocked[0]).toMatchObject({
      kind: 'remove-field',
      field: 'title',
    });
  });

  test('test_Diff_ChangedFieldType_IsBlocked', () => {
    const next = snap([entity('Note', [id, { name: 'title', type: 'integer', required: true }])]);
    expect(diffSnapshots(base, next).blocked[0].kind).toBe('change-field');
  });

  test('test_Diff_AccessChange_IsReportedAsAccessChange', () => {
    const before = snap([{ ...entity('Note', [id]), access: { scope: 'authenticated-read' } }]);
    const after = snap([{ ...entity('Note', [id]), access: { scope: 'private' } }]);
    expect(diffSnapshots(before, after).changes).toEqual([
      { kind: 'access-changed', entity: 'Note' },
    ]);
  });

  test('test_Diff_PermissionSetChange_IsReported', () => {
    expect(diffSnapshots(snap([], ['a.read']), snap([], ['a.read', 'a.write'])).changes).toEqual([
      { kind: 'permissions-changed' },
    ]);
  });
});

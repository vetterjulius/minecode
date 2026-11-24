import { describe, expect, test } from 'vitest';
import { buildListHandler, buildListRoute } from '../../src/generators/crud-routes.js';

describe('buildListHandler', () => {
  test('test_BuildListHandler_Defaults_OrdersByCreatedAtDescending', () => {
    const code = buildListHandler({ table: 'notification' });
    expect(code).toContain(".from('notification')");
    expect(code).toContain(".order('created_at', { ascending: false })");
  });

  test('test_BuildListHandler_AscendingOption_OrdersAscending', () => {
    expect(buildListHandler({ table: 'chat_message', ascending: true })).toContain(
      '{ ascending: true }'
    );
  });

  test('test_BuildListHandler_CustomOrderColumn_IsUsed', () => {
    expect(buildListHandler({ table: 't', orderBy: 'name' })).toContain(".order('name'");
  });

  test('test_BuildListHandler_WithOrganizationColumn_FiltersByQueryParameter', () => {
    const code = buildListHandler({ table: 'ticket', organizationColumn: 'organization_id' });
    expect(code).toContain("searchParams.get('organizationId')");
    expect(code).toContain(".eq('organization_id', organizationId)");
    expect(code).toContain('GET(request: Request)');
  });

  test('test_BuildListHandler_WithoutOrganizationColumn_HasNoFilterAndUnusedRequestIsUnderscored', () => {
    const code = buildListHandler({ table: 'notification' });
    expect(code).not.toContain('searchParams');
    expect(code).toContain('GET(_request: Request)');
  });
});

describe('buildListRoute', () => {
  test('test_BuildListRoute_Generated_HasImportsDocCommentAndHandler', () => {
    const code = buildListRoute('List things.', 'api/things', { table: 'thing' });
    expect(code).toContain("from '@supabase/auth-helpers-nextjs'");
    expect(code).toContain('List things.');
    expect(code).toContain('Path: /api/things');
    expect(code).toContain('export async function GET(');
  });
});

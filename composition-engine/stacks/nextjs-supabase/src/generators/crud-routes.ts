export interface ListHandlerOptions {
  table: string;
  orderBy?: string;
  ascending?: boolean;
  organizationColumn?: string;
}

/**
 * Source of a GET handler that lists rows of one table. Visibility is enforced by row level
 * security; the optional organizationId query parameter only narrows the result.
 */
export function buildListHandler(options: ListHandlerOptions): string {
  const orderBy = options.orderBy ?? 'created_at';
  const ascending = options.ascending ?? false;
  const filter = options.organizationColumn
    ? `
    const organizationId = new URL(request.url).searchParams.get('organizationId');
    if (organizationId) {
      query = query.eq('${options.organizationColumn}', organizationId);
    }`
    : '';
  const requestParam = options.organizationColumn ? 'request' : '_request';

  return `export async function GET(${requestParam}: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    let query = supabase
      .from('${options.table}')
      .select('*')
      .order('${orderBy}', { ascending: ${ascending} });${filter}

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
}

export function buildListRoute(
  description: string,
  routePath: string,
  options: ListHandlerOptions
): string {
  return `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * ${description}
 * Path: /${routePath}
 */
${buildListHandler(options)}`;
}

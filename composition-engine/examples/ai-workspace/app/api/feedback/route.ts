// Generated route: /api/feedback
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../generated/lib/supabase/server';
import { extensions } from '../../../extensions';

export const dynamic = 'force-dynamic';

function crudError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  const message =
    error instanceof Error
      ? error.message
      : ((error as { message?: string })?.message ?? String(error));
  const status = code === '42501' ? 403 : 400;
  return NextResponse.json({ success: false, error: message }, { status });
}

type ColumnKind = 'string' | 'number' | 'boolean' | 'json';

function checkBody(
  body: unknown,
  allowed: Record<string, ColumnKind>,
  required: string[]
): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!(key in allowed)) return `Unknown field: ${key}`;
  }
  for (const key of required) {
    if (record[key] === undefined || record[key] === null) return `Missing field: ${key}`;
  }
  for (const [key, kind] of Object.entries(allowed)) {
    const value = record[key];
    if (value === undefined || value === null || kind === 'json') continue;
    if (typeof value !== kind) return `Field ${key} must be a ${kind}`;
  }
  return null;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const params = new URL(request.url).searchParams;
    let query = supabase.from('feedback').select('*').order('created_at', { ascending: false });

    for (const column of ['id', 'rating', 'comment', 'user_id', 'organization_id', 'created_at']) {
      const value = params.get(column);
      if (value !== null) query = query.eq(column, value);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return crudError(error);
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const body = await request.json();
    const problem = checkBody(
      body,
      {
        rating: 'number',
        comment: 'string',
        organization_id: 'string',
      },
      ['rating', 'organization_id']
    );
    if (problem) {
      return NextResponse.json({ success: false, error: problem }, { status: 400 });
    }

    const { data: auth } = await supabase.auth.getUser();
    const context = { userId: auth.user?.id ?? null };
    const before = extensions.hooks?.['Feedback.beforeCreate'];
    const row = (before ? await before(body, context) : undefined) ?? body;

    const { data, error } = await supabase.from('feedback').insert(row).select().single();
    if (error) throw error;

    await extensions.hooks?.['Feedback.afterCreate']?.(data, context);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return crudError(error);
  }
}

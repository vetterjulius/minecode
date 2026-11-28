// Generated route: /api/organizations
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../generated/lib/supabase/server';
import { requirePermission } from '../../../generated/lib/permissions';

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

async function handleGET(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const params = new URL(request.url).searchParams;
    let query = supabase
      .from('organization')
      .select('*, membership(*)')
      .order('created_at', { ascending: false });

    for (const column of ['id', 'name', 'created_at']) {
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

export async function GET(...args: Parameters<typeof handleGET>) {
  const denied = await requirePermission(args[0], await createSupabaseServerClient(), 'org.read');
  if (denied) return denied;
  return handleGET(...args);
}

/**
 * Create an organization; the caller becomes its owner.
 * Path: /api/organizations
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { name } = await request.json();
    if (typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Missing field: name' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('create_organization', { org_name: name.trim() });
    if (error) {
      // 42501 is raised by the database function when the caller is not allowed.
      const status = error.code === '42501' ? 403 : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

// Generated route: /api/notifications
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
    let query = supabase.from('notification').select('*').order('created_at', { ascending: false });

    for (const column of ['id', 'user_id', 'channel', 'title', 'content', 'status', 'created_at']) {
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
  const denied = await requirePermission(
    args[0],
    await createSupabaseServerClient(),
    'notifications.read'
  );
  if (denied) return denied;
  return handleGET(...args);
}

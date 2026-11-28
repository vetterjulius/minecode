// Generated route: /api/notifications/send
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../generated/lib/supabase/server';
import { requirePermission } from '../../../../generated/lib/permissions';

export const dynamic = 'force-dynamic';

async function handlePOST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { user_id: userId, channel, title, content } = await request.json();

    if (!userId || !channel || !title || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const status = 'sent';

    const { data, error } = await supabase
      .from('notification')
      .insert({
        user_id: userId,
        channel,
        title,
        content,
        status,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(...args: Parameters<typeof handlePOST>) {
  const denied = await requirePermission(
    args[0],
    await createSupabaseServerClient(),
    'notifications.write'
  );
  if (denied) return denied;
  return handlePOST(...args);
}

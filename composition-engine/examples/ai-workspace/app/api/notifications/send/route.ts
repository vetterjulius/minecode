// Generated route: /api/notifications/send
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
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

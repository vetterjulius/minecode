// Generated route: /api/ai/chat
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

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

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const params = new URL(request.url).searchParams;
    let query = supabase.from('chat_message').select('*').order('created_at', { ascending: false });

    for (const column of ['id', 'session_id', 'role', 'content', 'created_at', 'user_id']) {
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
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { session_id: sessionId, content } = await request.json();

    if (!sessionId || !content) {
      return NextResponse.json(
        { success: false, error: 'Session ID and message content are required' },
        { status: 400 }
      );
    }

    const { error: userMsgError } = await supabase.from('chat_message').insert({
      session_id: sessionId,
      role: 'user',
      content,
    });

    if (userMsgError) throw userMsgError;

    const replies = [
      'I would be glad to help you with that support request!',
      "I've analyzed your account. It seems your Stripe billing subscription is fully active.",
      'To invite new team members, go to the Organizations page and send an invitation link.',
      'Could you please elaborate on the technical error you are facing in the console?',
      'I can assist you in creating a support ticket! Please specify the priority.',
    ];
    const mockReply = replies[Math.floor(Math.random() * replies.length)];

    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('chat_message')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: mockReply,
      })
      .select()
      .single();

    if (assistantMsgError) throw assistantMsgError;

    return NextResponse.json({ success: true, reply: assistantMsg });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

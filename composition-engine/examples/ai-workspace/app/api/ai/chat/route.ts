import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { sessionId, content } = await request.json();

    if (!sessionId || !content) {
      return NextResponse.json(
        { success: false, error: 'Session ID and message content are required' },
        { status: 400 }
      );
    }

    const { error: userMsgError } = await supabase.from('chatmessage').insert({
      sessionid: sessionId,
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
      .from('chatmessage')
      .insert({
        sessionid: sessionId,
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

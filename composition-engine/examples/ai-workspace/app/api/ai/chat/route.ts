// Generated route: /api/ai/chat
import { AiNotConfiguredError, completeChat } from '../../../../generated/lib/ai/complete';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../generated/lib/supabase/server';
import { requirePermission } from '../../../../generated/lib/permissions';

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

export async function GET(...args: Parameters<typeof handleGET>) {
  const denied = await requirePermission(
    args[0],
    await createSupabaseServerClient(),
    'chat.access'
  );
  if (denied) return denied;
  return handleGET(...args);
}

const HISTORY_LIMIT = 20;

/**
 * Stores the user's message, asks the configured AI provider (see lib/ai/complete.ts) with the
 * recent history of the session and stores the answer. Requires ANTHROPIC_API_KEY or OPENAI_API_KEY.
 * Path: /api/ai/chat
 */
async function handlePOST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { session_id: sessionId, content } = await request.json();

    if (!sessionId || !content) {
      return NextResponse.json(
        { success: false, error: 'Session ID and message content are required' },
        { status: 400 }
      );
    }

    const { error: userMsgError } = await supabase
      .from('chat_message')
      .insert({ session_id: sessionId, role: 'user', content });
    if (userMsgError) throw userMsgError;

    const { data: history, error: historyError } = await supabase
      .from('chat_message')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT);
    if (historyError) throw historyError;
    const turns = (history ?? [])
      .reverse()
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: String(m.content) }));

    const reply = await completeChat(turns, {
      system: 'You are a helpful support assistant for this application.',
    });

    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('chat_message')
      .insert({ session_id: sessionId, role: 'assistant', content: reply })
      .select()
      .single();
    if (assistantMsgError) throw assistantMsgError;

    return NextResponse.json({ success: true, reply: assistantMsg });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = error instanceof AiNotConfiguredError ? 503 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(...args: Parameters<typeof handlePOST>) {
  const denied = await requirePermission(
    args[0],
    await createSupabaseServerClient(),
    'chat.access'
  );
  if (denied) return denied;
  return handlePOST(...args);
}

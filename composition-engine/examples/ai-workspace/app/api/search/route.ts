// Generated route: /api/search
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../generated/lib/supabase/server';
import { requirePermission } from '../../../generated/lib/permissions';

export const dynamic = 'force-dynamic';

async function handleGET(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query) {
      return NextResponse.json({ success: true, results: [] });
    }

    const { data: ticketResults } = await supabase
      .from('ticket')
      .select('*')
      .ilike('title', `%${query}%`);

    const { data: kbResults } = await supabase
      .from('article')
      .select('*')
      .ilike('title', `%${query}%`);

    const results = [
      ...(ticketResults || []).map((t) => ({
        id: t.id,
        type: 'Ticket',
        title: t.title,
        desc: `Status: ${t.status}`,
      })),
      ...(kbResults || []).map((k) => ({
        id: k.id,
        type: 'Article',
        title: k.title,
        desc: k.category,
      })),
    ];

    return NextResponse.json({ success: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(...args: Parameters<typeof handleGET>) {
  const denied = await requirePermission(
    args[0],
    await createSupabaseServerClient(),
    'search.query'
  );
  if (denied) return denied;
  return handleGET(...args);
}

// Generated route: /api/search
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../generated/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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

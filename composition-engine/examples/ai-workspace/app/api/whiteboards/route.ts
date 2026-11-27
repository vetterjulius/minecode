import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    let query = supabase
      .from('whiteboard_session')
      .select('*')
      .order('created_at', { ascending: false });
    const organizationId = new URL(request.url).searchParams.get('organizationId');
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { name, organizationId } = await request.json();

    if (!name || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'Missing name or organizationId' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('whiteboard_session')
      .insert({
        name,
        organization_id: organizationId,
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

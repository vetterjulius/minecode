import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { data, error } = await supabase
      .from('whiteboardsession')
      .select('*')
      .order('createdat', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
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
      .from('whiteboardsession')
      .insert({
        name,
        organizationid: organizationId,
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

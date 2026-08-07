import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { data, error } = await supabase
      .from('project')
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
    const { name, description, organizationId, workspaceId } = await request.json();

    if (!name || !organizationId || !workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Missing name, organizationId, or workspaceId' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('project')
      .insert({
        id: crypto.randomUUID(),
        name,
        description: description || null,
        status: 'active',
        organizationid: organizationId,
        workspaceid: workspaceId,
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

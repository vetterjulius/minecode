import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { data, error } = await supabase
      .from('task')
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
    const { title, description, projectId, priority, assigneeId } = await request.json();

    if (!title || !projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing title or projectId' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('task')
      .insert({
        id: crypto.randomUUID(),
        title,
        description: description || null,
        status: 'todo',
        priority: priority || 'medium',
        projectid: projectId,
        assigneeid: assigneeId || null,
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

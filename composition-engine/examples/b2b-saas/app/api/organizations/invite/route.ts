import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Invite a new member via email.
 * Path: /api/organizations/invite
 */
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { organizationId, email, role } = await request.json();
    const { data: invitation, error } = await supabase
      .from('invitation')
      .insert({
        organizationId,
        email,
        role,
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 259200 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data: invitation });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

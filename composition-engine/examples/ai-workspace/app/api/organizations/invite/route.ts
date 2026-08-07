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
    const { email, organizationId, role } = await request.json();
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 259200 * 1000).toISOString();

    const { data, error } = await supabase
      .from('invitation')
      .insert({
        organizationid: organizationId,
        email,
        token,
        role: role || 'member',
        expiresat: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, invitation: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

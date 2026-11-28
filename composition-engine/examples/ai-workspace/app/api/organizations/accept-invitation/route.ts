// Generated route: /api/organizations/accept-invitation
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../generated/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Accept an invitation by token and join the organization.
 * Path: /api/organizations/accept-invitation
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { token } = await request.json();
    if (typeof token !== 'string' || token === '') {
      return NextResponse.json({ success: false, error: 'Missing field: token' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('accept_invitation', { invite_token: token });
    if (error) {
      // 42501 is raised by the database function when the caller is not allowed.
      const status = error.code === '42501' ? 403 : 400;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

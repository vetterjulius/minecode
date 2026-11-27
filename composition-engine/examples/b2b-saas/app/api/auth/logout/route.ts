// Generated route: /api/auth/logout
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../generated/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Invalidate the active session.
 * Path: /api/auth/logout
 */
export async function POST(_request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

// Generated route: /api/auth/logout
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

/**
 * Invalidate the active session.
 * Path: /api/auth/logout
 */
export async function POST(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

// Generated route: /api/auth/reset-password
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../generated/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Request password reset.
 * Path: /api/auth/reset-password
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { email } = await request.json();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(request.url).origin}/auth/update-password`,
    });
    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

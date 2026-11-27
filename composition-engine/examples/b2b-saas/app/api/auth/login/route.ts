// Generated route: /api/auth/login
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../generated/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Authenticate a user with email and password.
 * Path: /api/auth/login
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { email, password } = await request.json();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return NextResponse.json({ success: true, user: data.user, session: data.session });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * List organizations for current user.
 * Path: /api/organizations
 */
export async function GET(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { data, error } = await supabase.from('organization').select('*, membership(*)');

    if (error) throw error;
    return NextResponse.json({ success: true, organizations: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

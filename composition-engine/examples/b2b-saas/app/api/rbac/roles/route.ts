import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * List available system roles.
 * Path: /api/rbac/roles
 */
export async function GET(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { data: roles, error } = await supabase.from('role').select('*');

    if (error) throw error;
    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

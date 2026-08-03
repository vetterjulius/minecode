import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * List organizations for current user.
 * Path: /api/api/organizations
 */
export async function GET(_request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: memberships, error: memberError } = await supabase
      .from('membership')
      .select('organizationId')
      .eq('userId', user.id);

    if (memberError) throw memberError;

    const orgIds = memberships.map((m) => m.organizationId);
    const { data: organizations, error: orgError } = await supabase
      .from('organization')
      .select('*')
      .in('id', orgIds);

    if (orgError) throw orgError;

    return NextResponse.json({ success: true, data: organizations });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

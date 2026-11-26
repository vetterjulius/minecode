// Generated route: /api/rbac/member-role
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../generated/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Change the role of an organization member.
 * Path: /api/rbac/member-role
 */
export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { organization_id: organizationId, user_id: userId, role } = await request.json();
    if (!organizationId || !userId || !role) {
      return NextResponse.json(
        { success: false, error: 'organization_id, user_id and role are required' },
        { status: 400 }
      );
    }
    const { data, error } = await supabase.rpc('change_member_role', {
      org_id: organizationId,
      member_user_id: userId,
      new_role: role,
    });
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

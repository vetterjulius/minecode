// Generated route: /api/organizations/invite
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../generated/lib/supabase/server';
import { requirePermission } from '../../../../generated/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * Invite a new member via email.
 * Path: /api/organizations/invite
 */
async function handlePOST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { email, organization_id: organizationId, role } = await request.json();
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 259200 * 1000).toISOString();

    const { data, error } = await supabase
      .from('invitation')
      .insert({
        organization_id: organizationId,
        email,
        token,
        role: role || 'member',
        expires_at: expiresAt,
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

export async function POST(...args: Parameters<typeof handlePOST>) {
  const denied = await requirePermission(args[0], await createSupabaseServerClient(), 'org.invite');
  if (denied) return denied;
  return handlePOST(...args);
}

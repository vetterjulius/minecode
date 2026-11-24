import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * List uploaded files of the organization.
 * Path: /api/storage/files
 */
export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    let query = supabase.from('file').select('*').order('created_at', { ascending: false });
    const organizationId = new URL(request.url).searchParams.get('organizationId');
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';

interface PermissionClient {
  auth: { getUser(): PromiseLike<{ data: { user: unknown | null } }> };
  rpc(fn: string): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

async function requestedOrganization(request: Request): Promise<string | null> {
  const fromQuery = new URL(request.url).searchParams.get('organization_id');
  if (fromQuery) return fromQuery;
  if (request.method === 'GET' || request.method === 'HEAD') return null;
  try {
    const body = await request.clone().json();
    const value = (body as { organization_id?: unknown } | null)?.organization_id;
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

/** Returns a 401/403 response when the caller lacks the permission, otherwise null. */
export async function requirePermission(
  request: Request,
  supabase: PermissionClient,
  permission: string
): Promise<NextResponse | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  const { data, error } = await supabase.rpc('my_permissions');
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
  const organizationId = await requestedOrganization(request);
  const rows = (data ?? []) as { organization_id: string; permission: string }[];
  const allowed = rows.some(
    (row) =>
      row.permission === permission && (!organizationId || row.organization_id === organizationId)
  );
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: `Missing permission: ${permission}` },
      { status: 403 }
    );
  }
  return null;
}

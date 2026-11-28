import { generatedLibImport } from '../billing.js';

export const PERMISSION_GUARD_LIB_PATH = 'lib/permissions.ts';

/**
 * Server-side permission check for route handlers. It asks the database (`my_permissions`),
 * which is the single source of truth, so routes and row level security cannot disagree.
 * When the request names an organization (`organization_id` query parameter or JSON body field)
 * the permission must be held in that organization; otherwise in at least one.
 */
export const PERMISSION_GUARD_LIB = `import { NextResponse } from 'next/server';

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
      { success: false, error: \`Missing permission: \${permission}\` },
      { status: 403 }
    );
  }
  return null;
}
`;

const HANDLER_HEAD = /^export async function (GET|POST|PUT|PATCH|DELETE)\(/m;

/**
 * Wraps the handler in `code` so it only runs when the caller holds `permission`.
 * The original handler is renamed (`handlePOST`) and the exported one checks first.
 */
export function guardHandler(
  code: string,
  method: string,
  permission: string,
  serverClientImport: string
): { code: string; imports: string[] } {
  const wrapped = code.replace(HANDLER_HEAD, 'async function handle$1(');
  const guard = `
export async function ${method}(...args: Parameters<typeof handle${method}>) {
  const denied = await requirePermission(
    args[0],
    await createSupabaseServerClient(),
    '${permission}'
  );
  if (denied) return denied;
  return handle${method}(...args);
}
`;
  return {
    code: wrapped.trimEnd() + '\n' + guard,
    imports: [
      `import { requirePermission } from '${serverClientImport.replace(/supabase\/server$/, 'permissions')}';`,
    ],
  };
}

export { generatedLibImport };

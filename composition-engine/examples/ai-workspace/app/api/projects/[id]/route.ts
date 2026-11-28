// Generated route: /api/projects/[id]
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../generated/lib/supabase/server';
import { extensions } from '../../../../extensions';
import { requirePermission } from '../../../../generated/lib/permissions';

export const dynamic = 'force-dynamic';

function crudError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  const message =
    error instanceof Error
      ? error.message
      : ((error as { message?: string })?.message ?? String(error));
  const status = code === '42501' ? 403 : 400;
  return NextResponse.json({ success: false, error: message }, { status });
}

type ColumnKind = 'string' | 'number' | 'boolean' | 'json';

function checkBody(
  body: unknown,
  allowed: Record<string, ColumnKind>,
  required: string[]
): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return 'Request body must be a JSON object';
  }
  const record = body as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!(key in allowed)) return `Unknown field: ${key}`;
  }
  for (const key of required) {
    if (record[key] === undefined || record[key] === null) return `Missing field: ${key}`;
  }
  for (const [key, kind] of Object.entries(allowed)) {
    const value = record[key];
    if (value === undefined || value === null || kind === 'json') continue;
    if (typeof value !== kind) return `Field ${key} must be a ${kind}`;
  }
  return null;
}

async function handleDELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  try {
    const { id } = await params;
    const { data: auth } = await supabase.auth.getUser();
    const context = { userId: auth.user?.id ?? null, id: id };
    await extensions.hooks?.['Project.beforeDelete']?.(id, context);

    const { data, error } = await supabase
      .from('project')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    await extensions.hooks?.['Project.afterDelete']?.(data, context);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return crudError(error);
  }
}

export async function DELETE(...args: Parameters<typeof handleDELETE>) {
  const denied = await requirePermission(
    args[0],
    await createSupabaseServerClient(),
    'project.write'
  );
  if (denied) return denied;
  return handleDELETE(...args);
}

async function handleGET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  try {
    const { id } = await params;
    const { data, error } = await supabase.from('project').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return crudError(error);
  }
}

export async function GET(...args: Parameters<typeof handleGET>) {
  const denied = await requirePermission(
    args[0],
    await createSupabaseServerClient(),
    'project.read'
  );
  if (denied) return denied;
  return handleGET(...args);
}

async function handlePATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  try {
    const { id } = await params;
    const body = await request.json();
    const problem = checkBody(
      body,
      {
        name: 'string',
        description: 'string',
        status: 'string',
        organization_id: 'string',
        workspace_id: 'string',
      },
      []
    );
    if (problem) {
      return NextResponse.json({ success: false, error: problem }, { status: 400 });
    }
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    const { data: auth } = await supabase.auth.getUser();
    const context = { userId: auth.user?.id ?? null, id: id };
    const before = extensions.hooks?.['Project.beforeUpdate'];
    const patch = (before ? await before(body, context) : undefined) ?? body;

    const { data, error } = await supabase
      .from('project')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    await extensions.hooks?.['Project.afterUpdate']?.(data, context);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return crudError(error);
  }
}

export async function PATCH(...args: Parameters<typeof handlePATCH>) {
  const denied = await requirePermission(
    args[0],
    await createSupabaseServerClient(),
    'project.write'
  );
  if (denied) return denied;
  return handlePATCH(...args);
}

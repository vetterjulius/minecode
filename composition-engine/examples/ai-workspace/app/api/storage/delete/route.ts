// Generated route: /api/storage/delete
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../generated/lib/supabase/server';
import { requirePermission } from '../../../../generated/lib/permissions';

export const dynamic = 'force-dynamic';

async function handleDELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { id, path } = await request.json();

    if (!id || !path) {
      return NextResponse.json({ success: false, error: 'Missing ID or path' }, { status: 400 });
    }

    const { error: storageError } = await supabase.storage.from('files').remove([path]);

    if (storageError) throw storageError;

    const { error: dbError } = await supabase.from('file').delete().eq('id', id);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(...args: Parameters<typeof handleDELETE>) {
  const denied = await requirePermission(
    args[0],
    await createSupabaseServerClient(),
    'storage.write'
  );
  if (denied) return denied;
  return handleDELETE(...args);
}

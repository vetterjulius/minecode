// Generated route: /api/storage/upload
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../generated/lib/supabase/server';
import { requirePermission } from '../../../../generated/lib/permissions';

export const dynamic = 'force-dynamic';

async function handlePOST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const organizationId = (formData.get('organization_id') as string) || null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const filePath = `uploads/${crypto.randomUUID()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('files').upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data, error: dbError } = await supabase
      .from('file')
      .insert({
        name: file.name,
        path: filePath,
        size: file.size,
        mime_type: file.type,
        organization_id: organizationId,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(...args: Parameters<typeof handlePOST>) {
  const denied = await requirePermission(
    args[0],
    await createSupabaseServerClient(),
    'storage.write'
  );
  if (denied) return denied;
  return handlePOST(...args);
}

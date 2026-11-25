// Generated route: /api/storage/upload
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
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

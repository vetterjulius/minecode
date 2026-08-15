import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing file ID' }, { status: 400 });
    }

    const { data: fileRecord, error: fetchError } = await supabase
      .from('file')
      .select('path')
      .eq('id', id)
      .single();

    if (fetchError || !fileRecord) {
      return NextResponse.json({ success: false, error: 'File record not found' }, { status: 404 });
    }

    const { error: storageError } = await supabase.storage.from('files').remove([fileRecord.path]);

    if (storageError) throw storageError;

    const { error: dbError } = await supabase.from('file').delete().eq('id', id);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

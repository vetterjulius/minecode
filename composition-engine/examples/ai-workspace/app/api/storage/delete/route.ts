import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
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

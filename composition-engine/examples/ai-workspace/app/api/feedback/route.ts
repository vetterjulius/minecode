import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const { rating, comment, userId, organizationId } = await request.json();

    if (!rating || !userId || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'Rating, userId, and organizationId are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert({
        rating: Number(rating),
        comment: comment || null,
        userid: userId,
        organizationid: organizationId,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

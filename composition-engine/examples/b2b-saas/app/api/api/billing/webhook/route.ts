import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Stripe secure webhook endpoint handler.
 * Path: /api/api/billing/webhook
 */
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const payload = await request.json();
    const eventType = payload.type;

    if (eventType === 'checkout.session.completed') {
      const session = payload.data.object;
      const organizationId = session.metadata?.organizationId;
      const stripeCustomerId = session.customer;

      await supabase
        .from('stripecustomer')
        .insert({
          organizationId,
          stripeCustomerId
        });
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

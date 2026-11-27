import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyStripeSignature } from '../../../../generated/lib/billing/verify-stripe-signature';

/**
 * Stripe secure webhook endpoint handler.
 * Path: /api/billing/webhook
 * Requires STRIPE_WEBHOOK_SECRET; requests without a valid Stripe signature are rejected.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: 'STRIPE_WEBHOOK_SECRET is not configured' },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  try {
    const payload = JSON.parse(rawBody);

    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      await supabase.from('stripecustomer').insert({
        organizationId: session.metadata?.organizationId,
        stripeCustomerId: session.customer,
      });
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

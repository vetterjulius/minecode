// Generated route: /api/billing/webhook
import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../generated/lib/supabase/admin';
import { verifyStripeSignature } from '../../../../generated/lib/billing/verify-stripe-signature';

export const dynamic = 'force-dynamic';

/**
 * Stripe secure webhook endpoint handler.
 * Path: /api/billing/webhook
 * Requires STRIPE_WEBHOOK_SECRET and SUPABASE_SERVICE_ROLE_KEY. Requests without a valid
 * Stripe signature are rejected before the body is parsed.
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

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (payload.type !== 'checkout.session.completed') {
    return NextResponse.json({ success: true, received: true, ignored: true });
  }

  const session = payload.data?.object;
  const organizationId = session?.metadata?.organizationId;
  if (!organizationId || !session?.customer) {
    return NextResponse.json({ success: true, received: true, ignored: true });
  }

  try {
    const { error } = await createAdminClient()
      .from('stripe_customer')
      .upsert(
        { organization_id: organizationId, stripe_customer_id: session.customer },
        { onConflict: 'stripe_customer_id' }
      );
    if (error) throw error;
    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

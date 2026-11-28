// Generated route: /api/billing/checkout
import { NextResponse } from 'next/server';
import {
  createCheckoutSession,
  StripeError,
} from '../../../../generated/lib/billing/create-checkout-session';
import { createSupabaseServerClient } from '../../../../generated/lib/supabase/server';
import { requirePermission } from '../../../../generated/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * Create a new checkout session.
 * Path: /api/billing/checkout
 * Body: { organization_id, price_id }. Requires STRIPE_SECRET_KEY. The caller must hold the
 * endpoint's permission in the organization (checked before this handler runs).
 */
async function handlePOST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { success: false, error: 'STRIPE_SECRET_KEY is not configured' },
      { status: 503 }
    );
  }
  try {
    const { organization_id: organizationId, price_id: priceId } = await request.json();
    if (
      typeof organizationId !== 'string' ||
      typeof priceId !== 'string' ||
      !organizationId ||
      !priceId
    ) {
      return NextResponse.json(
        { success: false, error: 'organization_id and price_id are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: customer } = await supabase
      .from('stripe_customer')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const origin = new URL(request.url).origin;
    const session = await createCheckoutSession({
      secretKey,
      priceId,
      organizationId,
      customerId: customer?.stripe_customer_id ?? null,
      successUrl: `${origin}/billing?checkout=success`,
      cancelUrl: `${origin}/billing?checkout=cancelled`,
    });
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = error instanceof StripeError ? 502 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(...args: Parameters<typeof handlePOST>) {
  const denied = await requirePermission(
    args[0],
    await createSupabaseServerClient(),
    'billing.write'
  );
  if (denied) return denied;
  return handlePOST(...args);
}

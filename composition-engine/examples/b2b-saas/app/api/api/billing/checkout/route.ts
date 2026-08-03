import { NextResponse } from 'next/server';

/**
 * Create a new checkout session.
 * Path: /api/api/billing/checkout
 */
export async function POST(_request: Request) {
  try {
    const checkoutSessionUrl = `https://checkout.stripe.com/pay/session_mock_${crypto.randomUUID()}`;
    return NextResponse.json({ success: true, url: checkoutSessionUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

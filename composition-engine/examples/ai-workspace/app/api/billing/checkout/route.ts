// Generated route: /api/billing/checkout
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Create a new checkout session.
 * Path: /api/billing/checkout
 * Not implemented: no Stripe checkout session is created yet.
 */
export async function POST(_request: Request) {
  return NextResponse.json(
    { success: false, error: 'Stripe checkout is not implemented yet' },
    { status: 501 }
  );
}

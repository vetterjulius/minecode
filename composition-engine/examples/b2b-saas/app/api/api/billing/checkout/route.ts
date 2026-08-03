import { NextResponse } from 'next/server';

/**
 * Create a new checkout session.
 * Path: /api/api/billing/checkout
 */
export async function POST(_request: Request) {
  return NextResponse.json({
    message: 'Mock response for Checkout API endpoint using POST',
    success: true,
    timestamp: new Date().toISOString(),
  });
}

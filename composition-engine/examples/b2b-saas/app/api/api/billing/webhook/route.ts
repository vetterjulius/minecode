import { NextResponse } from 'next/server';

/**
 * Stripe secure webhook endpoint handler.
 * Path: /api/api/billing/webhook
 */
export async function POST(_request: Request) {
  return NextResponse.json({
    message: 'Mock response for Webhook API endpoint using POST',
    success: true,
    timestamp: new Date().toISOString(),
  });
}

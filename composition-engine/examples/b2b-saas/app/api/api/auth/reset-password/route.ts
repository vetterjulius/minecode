import { NextResponse } from 'next/server';

/**
 * Request password reset.
 * Path: /api/api/auth/reset-password
 */
export async function POST(_request: Request) {
  return NextResponse.json({
    message: 'Mock response for ResetPassword API endpoint using POST',
    success: true,
    timestamp: new Date().toISOString(),
  });
}

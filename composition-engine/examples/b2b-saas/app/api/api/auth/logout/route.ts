import { NextResponse } from 'next/server';

/**
 * Invalidate the active session.
 * Path: /api/api/auth/logout
 */
export async function POST(_request: Request) {
  return NextResponse.json({
    message: 'Mock response for Logout API endpoint using POST',
    success: true,
    timestamp: new Date().toISOString(),
  });
}

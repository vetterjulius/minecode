import { NextResponse } from 'next/server';

/**
 * Authenticate a user with email and password.
 * Path: /api/api/auth/login
 */
export async function POST(_request: Request) {
  return NextResponse.json({
    message: 'Mock response for Login API endpoint using POST',
    success: true,
    timestamp: new Date().toISOString(),
  });
}

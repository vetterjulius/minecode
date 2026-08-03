import { NextResponse } from 'next/server';

/**
 * List available system roles.
 * Path: /api/api/rbac/roles
 */
export async function GET(_request: Request) {
  return NextResponse.json({
    message: 'Mock response for ListRoles API endpoint using GET',
    success: true,
    timestamp: new Date().toISOString(),
  });
}

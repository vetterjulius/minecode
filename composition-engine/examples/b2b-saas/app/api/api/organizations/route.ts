import { NextResponse } from 'next/server';

/**
 * List organizations for current user.
 * Path: /api/api/organizations
 */
export async function GET(_request: Request) {
  return NextResponse.json({
    message: 'Mock response for ListOrganizations API endpoint using GET',
    success: true,
    timestamp: new Date().toISOString(),
  });
}

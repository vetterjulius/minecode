// Generated route: /api/billing/checkout
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../generated/lib/supabase/server';
import { requirePermission } from '../../../../generated/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * Create a new checkout session.
 * Path: /api/billing/checkout
 * Not implemented: no Stripe checkout session is created yet.
 */
async function handlePOST(_request: Request) {
  return NextResponse.json(
    { success: false, error: 'Stripe checkout is not implemented yet' },
    { status: 501 }
  );
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

export const STRIPE_SIGNATURE_LIB_PATH = 'lib/billing/verify-stripe-signature.ts';

export const STRIPE_SIGNATURE_LIB = `import { createHmac, timingSafeEqual } from 'node:crypto';

const TOLERANCE_SECONDS = 300;

interface ParsedSignature {
  timestamp: number;
  signatures: string[];
}

function parseSignatureHeader(header: string): ParsedSignature | null {
  let timestamp = Number.NaN;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = Number(value);
    if (key === 'v1' && value) signatures.push(value);
  }
  if (!Number.isFinite(timestamp) || signatures.length === 0) return null;
  return { timestamp, signatures };
}

function equalsHex(actual: string, expected: string): boolean {
  const left = Buffer.from(actual, 'hex');
  const right = Buffer.from(expected, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (!header) return false;
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;
  if (Math.abs(nowSeconds - parsed.timestamp) > TOLERANCE_SECONDS) return false;
  const expected = createHmac('sha256', secret)
    .update(\`\${parsed.timestamp}.\${payload}\`)
    .digest('hex');
  return parsed.signatures.some((signature) => equalsHex(signature, expected));
}
`;

function relativeLibImport(routePath: string): string {
  const depth = routePath.split('/').length + 1;
  return `${'../'.repeat(depth)}generated/lib/billing/verify-stripe-signature`;
}

export function buildCheckoutRoute(description: string, routePath: string): string {
  return `import { NextResponse } from 'next/server';

/**
 * ${description}
 * Path: /${routePath}
 * Not implemented: no Stripe checkout session is created yet.
 */
export async function POST(_request: Request) {
  return NextResponse.json(
    { success: false, error: 'Stripe checkout is not implemented yet' },
    { status: 501 }
  );
}
`;
}

export function buildWebhookRoute(description: string, routePath: string): string {
  return `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyStripeSignature } from '${relativeLibImport(routePath)}';

/**
 * ${description}
 * Path: /${routePath}
 * Requires STRIPE_WEBHOOK_SECRET; requests without a valid Stripe signature are rejected.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: 'STRIPE_WEBHOOK_SECRET is not configured' },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  try {
    const payload = JSON.parse(rawBody);

    if (payload.type === 'checkout.session.completed') {
      const session = payload.data.object;
      await supabase.from('stripecustomer').insert({
        organizationId: session.metadata?.organizationId,
        stripeCustomerId: session.customer,
      });
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
}

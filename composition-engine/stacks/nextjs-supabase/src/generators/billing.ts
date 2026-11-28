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

export const SUPABASE_SERVER_LIB_PATH = 'lib/supabase/server.ts';

export const SUPABASE_SERVER_LIB = `import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client for route handlers and server components. It reads and refreshes the
 * user's session cookie, so row level security applies as that user.
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  }
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try {
          for (const { name, value, options } of items) cookieStore.set(name, value, options);
        } catch {
          // Called from a context that cannot set cookies; the session refreshes on the next request.
        }
      },
    },
  });
}
`;

export const SUPABASE_ADMIN_LIB_PATH = 'lib/supabase/admin.ts';

export const SUPABASE_ADMIN_LIB = `import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client for trusted server code (webhooks, background jobs).
 * It bypasses row level security: never import it from client components
 * and never expose the service role key to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
`;

export function generatedLibImport(routePath: string, lib: string): string {
  const depth = routePath.split('/').length + 1;
  return `${'../'.repeat(depth)}generated/lib/${lib}`;
}

export function buildWebhookRoute(description: string, routePath: string): string {
  return `import { NextResponse } from 'next/server';
import { createAdminClient } from '${generatedLibImport(routePath, 'supabase/admin')}';
import { verifyStripeSignature } from '${generatedLibImport(routePath, 'billing/verify-stripe-signature')}';

/**
 * ${description}
 * Path: /${routePath}
 * Requires STRIPE_WEBHOOK_SECRET and SUPABASE_SERVICE_ROLE_KEY. Requests without a valid
 * Stripe signature are rejected before the body is parsed.
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

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (payload.type !== 'checkout.session.completed') {
    return NextResponse.json({ success: true, received: true, ignored: true });
  }

  const session = payload.data?.object;
  const organizationId = session?.metadata?.organizationId;
  if (!organizationId || !session?.customer) {
    return NextResponse.json({ success: true, received: true, ignored: true });
  }

  try {
    const { error } = await createAdminClient()
      .from('stripe_customer')
      .upsert(
        { organization_id: organizationId, stripe_customer_id: session.customer },
        { onConflict: 'stripe_customer_id' }
      );
    if (error) throw error;
    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
`;
}

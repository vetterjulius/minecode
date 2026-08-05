import { SubGenerator, CompositionPlan } from '@minecode/core';

export class NextjsSupabaseBillingSubGenerator implements SubGenerator {
  public readonly id = 'nextjs-supabase-billing';

  public generate(plan: CompositionPlan): Record<string, string> {
    const files: Record<string, string> = {};

    for (const apiDef of plan.api) {
      const normalizedPath = apiDef.path.replace(/^\/+|\/+$/g, '');
      const method = apiDef.method || 'GET';
      const name = apiDef.name;
      const desc = apiDef.description || `Handler for ${name} (${method})`;

      const fullRoutePath = normalizedPath.startsWith('api/')
        ? normalizedPath
        : `api/${normalizedPath}`;

      if (fullRoutePath === 'api/billing/checkout') {
        files[`app/${fullRoutePath}/route.ts`] = `import { NextResponse } from 'next/server';

/**
 * ${desc}
 * Path: /${fullRoutePath}
 */
export async function POST(_request: Request) {
  try {
    const checkoutSessionUrl = \`https://checkout.stripe.com/pay/session_mock_\${crypto.randomUUID()}\`;
    return NextResponse.json({ success: true, url: checkoutSessionUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
`;
      } else if (fullRoutePath === 'api/billing/webhook') {
        files[`app/${fullRoutePath}/route.ts`] = `import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * ${desc}
 * Path: /${fullRoutePath}
 */
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const payload = await request.json();
    const eventType = payload.type;

    if (eventType === 'checkout.session.completed') {
      const session = payload.data.object;
      const organizationId = session.metadata?.organizationId;
      const stripeCustomerId = session.customer;

      await supabase
        .from('stripecustomer')
        .insert({
          organizationId,
          stripeCustomerId
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
    }

    for (const uiDef of plan.ui) {
      if (uiDef.route) {
        const normalizedRoute = uiDef.route.replace(/^\/+|\/+$/g, '');

        if (normalizedRoute === 'billing') {
          files[`app/${normalizedRoute}/page.tsx`] = `import React, { useState } from 'react';

export default function BillingSettingsPage() {
  const [organizationId, setOrganizationId] = useState('');
  const [priceId, setPriceId] = useState('');
  const [status, setStatus] = useState('');

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Creating checkout session...');
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, priceId }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setStatus('Error: ' + data.error);
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus('Failed: ' + message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-xl w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Billing Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your organization's subscription and billing integrations.</p>

        <form onSubmit={handleCheckout} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Organization ID</label>
            <input type="text" value={organizationId} onChange={e => setOrganizationId(e.target.value)} required className="w-full p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price ID</label>
            <input type="text" value={priceId} onChange={e => setPriceId(e.target.value)} required className="w-full p-2 border rounded-md" />
          </div>
          <button type="submit" className="w-full p-2 bg-foreground text-background font-bold rounded-md hover:opacity-90">Checkout with Stripe</button>
          {status && <p className="text-center text-sm font-semibold">{status}</p>}
        </form>
      </div>
    </div>
  );
}
`;
        }
      }
    }

    return files;
  }
}

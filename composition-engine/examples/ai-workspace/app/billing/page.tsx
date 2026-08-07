import React, { useState } from 'react';

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus('Failed: ' + message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-xl w-full p-8 border rounded-xl shadow-lg bg-card text-card-foreground space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Billing Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization's subscription and billing integrations.
        </p>

        <form onSubmit={handleCheckout} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Organization ID</label>
            <input
              type="text"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              required
              className="w-full p-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price ID</label>
            <input
              type="text"
              value={priceId}
              onChange={(e) => setPriceId(e.target.value)}
              required
              className="w-full p-2 border rounded-md"
            />
          </div>
          <button
            type="submit"
            className="w-full p-2 bg-foreground text-background font-bold rounded-md hover:opacity-90"
          >
            Checkout with Stripe
          </button>
          {status && <p className="text-center text-sm font-semibold">{status}</p>}
        </form>
      </div>
    </div>
  );
}

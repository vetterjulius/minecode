export interface CheckoutInput {
  secretKey: string;
  priceId: string;
  organizationId: string;
  successUrl: string;
  cancelUrl: string;
  /** Existing Stripe customer of the organization, if it already has one. */
  customerId?: string | null;
}

export class StripeError extends Error {}

/** Creates a Stripe Checkout session for a subscription and returns its hosted URL. */
export async function createCheckoutSession(
  input: CheckoutInput,
  fetchImpl: typeof fetch = fetch
): Promise<{ id: string; url: string }> {
  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': input.priceId,
    'line_items[0][quantity]': '1',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.organizationId,
    'metadata[organizationId]': input.organizationId,
    'subscription_data[metadata][organizationId]': input.organizationId,
  });
  if (input.customerId) params.set('customer', input.customerId);

  const response = await fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const body = (await response.json().catch(() => null)) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  } | null;
  if (!response.ok || !body?.id || !body.url) {
    throw new StripeError(body?.error?.message ?? `Stripe request failed (${response.status})`);
  }
  return { id: body.id, url: body.url };
}

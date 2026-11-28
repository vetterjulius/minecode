import { generatedLibImport } from './billing.js';

/**
 * Integrations with external providers (Stripe, AI models). They talk to the providers' HTTP APIs
 * directly (no SDK dependency in the generated app) and read their credentials from the
 * environment. Without credentials the routes answer 503 instead of pretending to work.
 */

export const STRIPE_CHECKOUT_LIB_PATH = 'lib/billing/create-checkout-session.ts';

export const STRIPE_CHECKOUT_LIB = `export interface CheckoutInput {
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
      Authorization: \`Bearer \${input.secretKey}\`,
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
    throw new StripeError(body?.error?.message ?? \`Stripe request failed (\${response.status})\`);
  }
  return { id: body.id, url: body.url };
}
`;

export function buildCheckoutRoute(
  description: string,
  routePath: string,
  serverClientImport: string
): string {
  return `import { createSupabaseServerClient } from '${serverClientImport}';
import { createCheckoutSession, StripeError } from '${generatedLibImport(routePath, 'billing/create-checkout-session')}';
import { NextResponse } from 'next/server';

/**
 * ${description}
 * Path: /${routePath}
 * Body: { organization_id, price_id }. Requires STRIPE_SECRET_KEY. The caller must hold the
 * endpoint's permission in the organization (checked before this handler runs).
 */
export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { success: false, error: 'STRIPE_SECRET_KEY is not configured' },
      { status: 503 }
    );
  }
  try {
    const { organization_id: organizationId, price_id: priceId } = await request.json();
    if (typeof organizationId !== 'string' || typeof priceId !== 'string' || !organizationId || !priceId) {
      return NextResponse.json(
        { success: false, error: 'organization_id and price_id are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data: customer } = await supabase
      .from('stripe_customer')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const origin = new URL(request.url).origin;
    const session = await createCheckoutSession({
      secretKey,
      priceId,
      organizationId,
      customerId: customer?.stripe_customer_id ?? null,
      successUrl: \`\${origin}/billing?checkout=success\`,
      cancelUrl: \`\${origin}/billing?checkout=cancelled\`,
    });
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = error instanceof StripeError ? 502 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
`;
}

export const AI_COMPLETE_LIB_PATH = 'lib/ai/complete.ts';

export const AI_COMPLETE_LIB = `export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export class AiNotConfiguredError extends Error {}
export class AiProviderError extends Error {}

type Env = Record<string, string | undefined>;

const DEFAULT_MODELS = { anthropic: 'claude-sonnet-5-5', openai: 'gpt-4o-mini' } as const;

/**
 * Picks the provider from AI_PROVIDER ('anthropic' | 'openai'), or from whichever API key is
 * set (ANTHROPIC_API_KEY first). AI_MODEL overrides the default model.
 */
export function resolveProvider(env: Env = process.env) {
  const keys = { anthropic: env.ANTHROPIC_API_KEY, openai: env.OPENAI_API_KEY };
  const requested = env.AI_PROVIDER;
  const provider =
    requested === 'anthropic' || requested === 'openai'
      ? requested
      : keys.anthropic
        ? 'anthropic'
        : keys.openai
          ? 'openai'
          : null;
  const apiKey = provider ? keys[provider] : undefined;
  if (!provider || !apiKey) {
    throw new AiNotConfiguredError(
      'No AI provider configured: set ANTHROPIC_API_KEY or OPENAI_API_KEY (and optionally AI_PROVIDER, AI_MODEL)'
    );
  }
  return { provider, apiKey, model: env.AI_MODEL || DEFAULT_MODELS[provider] };
}

/** Sends the conversation to the configured provider and returns the assistant's reply text. */
export async function completeChat(
  turns: ChatTurn[],
  options: { system?: string; env?: Env; fetchImpl?: typeof fetch } = {}
): Promise<string> {
  const { provider, apiKey, model } = resolveProvider(options.env);
  const fetchImpl = options.fetchImpl ?? fetch;
  const request: { url: string; headers: Record<string, string>; body: unknown } =
    provider === 'anthropic'
      ? {
          url: 'https://api.anthropic.com/v1/messages',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: { model, max_tokens: 1024, system: options.system, messages: turns },
        }
      : {
          url: 'https://api.openai.com/v1/chat/completions',
          headers: { Authorization: \`Bearer \${apiKey}\` },
          body: {
            model,
            messages: [
              ...(options.system ? [{ role: 'system', content: options.system }] : []),
              ...turns,
            ],
          },
        };

  const response = await fetchImpl(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...request.headers },
    body: JSON.stringify(request.body),
  });
  const body = (await response.json().catch(() => null)) as any;
  if (!response.ok) {
    throw new AiProviderError(body?.error?.message ?? \`AI provider request failed (\${response.status})\`);
  }
  const text: unknown =
    provider === 'anthropic'
      ? (body?.content ?? [])
          .filter((part: { type?: string }) => part.type === 'text')
          .map((part: { text: string }) => part.text)
          .join('')
      : body?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || text === '') {
    throw new AiProviderError('AI provider returned no text');
  }
  return text;
}
`;

export function buildAiChatRoute(routePath: string, serverClientImport: string): string {
  return `import { createSupabaseServerClient } from '${serverClientImport}';
import { AiNotConfiguredError, completeChat } from '${generatedLibImport(routePath, 'ai/complete')}';
import { NextResponse } from 'next/server';

const HISTORY_LIMIT = 20;

/**
 * Stores the user's message, asks the configured AI provider (see lib/ai/complete.ts) with the
 * recent history of the session and stores the answer. Requires ANTHROPIC_API_KEY or OPENAI_API_KEY.
 * Path: /${routePath}
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  try {
    const { session_id: sessionId, content } = await request.json();

    if (!sessionId || !content) {
      return NextResponse.json(
        { success: false, error: 'Session ID and message content are required' },
        { status: 400 }
      );
    }

    const { error: userMsgError } = await supabase
      .from('chat_message')
      .insert({ session_id: sessionId, role: 'user', content });
    if (userMsgError) throw userMsgError;

    const { data: history, error: historyError } = await supabase
      .from('chat_message')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT);
    if (historyError) throw historyError;
    const turns = (history ?? [])
      .reverse()
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: String(m.content) }));

    const reply = await completeChat(turns, {
      system: 'You are a helpful support assistant for this application.',
    });

    const { data: assistantMsg, error: assistantMsgError } = await supabase
      .from('chat_message')
      .insert({ session_id: sessionId, role: 'assistant', content: reply })
      .select()
      .single();
    if (assistantMsgError) throw assistantMsgError;

    return NextResponse.json({ success: true, reply: assistantMsg });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = error instanceof AiNotConfiguredError ? 503 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
`;
}

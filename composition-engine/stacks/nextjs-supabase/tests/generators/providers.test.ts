import ts from 'typescript';
import { describe, expect, test, vi } from 'vitest';
import {
  AI_COMPLETE_LIB,
  STRIPE_CHECKOUT_LIB,
  buildAiChatRoute,
  buildCheckoutRoute,
} from '../../src/generators/providers.js';

/** Compiles a generated library and loads it, so its real behavior is tested. */
function load<T>(source: string): T {
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', js)(module, module.exports);
  return module.exports as T;
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('generated Stripe checkout library', () => {
  const lib = load<{
    createCheckoutSession: (i: unknown, f: typeof fetch) => Promise<{ id: string; url: string }>;
  }>(STRIPE_CHECKOUT_LIB);
  const input = {
    secretKey: 'sk_test_1',
    priceId: 'price_1',
    organizationId: 'org-1',
    successUrl: 'https://app/ok',
    cancelUrl: 'https://app/no',
  };

  test('test_CreateCheckoutSession_Success_SendsSubscriptionFormAndReturnsUrl', async () => {
    const fetchImpl = vi.fn(() => json({ id: 'cs_1', url: 'https://stripe/pay' }));
    const result = await lib.createCheckoutSession(
      { ...input, customerId: 'cus_9' },
      fetchImpl as unknown as typeof fetch
    );
    expect(result).toEqual({ id: 'cs_1', url: 'https://stripe/pay' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.stripe.com/v1/checkout/sessions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk_test_1');
    const form = init.body as URLSearchParams;
    expect(form.get('mode')).toBe('subscription');
    expect(form.get('line_items[0][price]')).toBe('price_1');
    expect(form.get('metadata[organizationId]')).toBe('org-1');
    expect(form.get('customer')).toBe('cus_9');
  });

  test('test_CreateCheckoutSession_StripeError_ThrowsWithStripeMessage', async () => {
    const fetchImpl = (() =>
      json({ error: { message: 'No such price' } }, 400)) as unknown as typeof fetch;
    await expect(lib.createCheckoutSession(input, fetchImpl)).rejects.toThrow('No such price');
  });
});

describe('generated AI completion library', () => {
  const lib = load<{
    resolveProvider: (env: Record<string, string>) => { provider: string; model: string };
    completeChat: (
      turns: { role: string; content: string }[],
      o: { system?: string; env?: Record<string, string>; fetchImpl?: typeof fetch }
    ) => Promise<string>;
  }>(AI_COMPLETE_LIB);
  const turns = [{ role: 'user', content: 'hi' }];

  test('test_ResolveProvider_NoKeys_ThrowsNotConfigured', () => {
    expect(() => lib.resolveProvider({})).toThrow(/No AI provider configured/);
  });

  test('test_ResolveProvider_PrefersAnthropicAndHonorsOverrides', () => {
    expect(lib.resolveProvider({ ANTHROPIC_API_KEY: 'a', OPENAI_API_KEY: 'o' }).provider).toBe(
      'anthropic'
    );
    expect(lib.resolveProvider({ OPENAI_API_KEY: 'o' }).provider).toBe('openai');
    const forced = lib.resolveProvider({
      ANTHROPIC_API_KEY: 'a',
      OPENAI_API_KEY: 'o',
      AI_PROVIDER: 'openai',
      AI_MODEL: 'm',
    });
    expect(forced).toMatchObject({ provider: 'openai', model: 'm' });
  });

  test('test_CompleteChat_Anthropic_SendsMessagesApiRequestAndJoinsText', async () => {
    const fetchImpl = vi.fn(() =>
      json({
        content: [
          { type: 'text', text: 'Hel' },
          { type: 'text', text: 'lo' },
        ],
      })
    );
    const reply = await lib.completeChat(turns, {
      system: 'sys',
      env: { ANTHROPIC_API_KEY: 'key' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(reply).toBe('Hello');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('key');
    expect(JSON.parse(init.body as string)).toMatchObject({ system: 'sys', messages: turns });
  });

  test('test_CompleteChat_OpenAi_PutsSystemPromptFirst', async () => {
    const fetchImpl = vi.fn(() => json({ choices: [{ message: { content: 'yo' } }] }));
    const reply = await lib.completeChat(turns, {
      system: 'sys',
      env: { OPENAI_API_KEY: 'k' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(reply).toBe('yo');
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(init.body as string).messages[0]).toEqual({ role: 'system', content: 'sys' });
  });

  test('test_CompleteChat_ProviderFailure_ThrowsProviderMessage', async () => {
    const fetchImpl = (() =>
      json({ error: { message: 'rate limited' } }, 429)) as unknown as typeof fetch;
    await expect(
      lib.completeChat(turns, { env: { OPENAI_API_KEY: 'k' }, fetchImpl })
    ).rejects.toThrow('rate limited');
  });
});

describe('provider routes', () => {
  test('test_BuildCheckoutRoute_Generated_Answers503WithoutKeyAndNeverFakesAUrl', () => {
    const route = buildCheckoutRoute('d', 'api/billing/checkout', '../s');
    expect(route).toContain('STRIPE_SECRET_KEY is not configured');
    expect(route).toContain('status: 503');
    expect(route).not.toContain('session_mock');
    expect(route).toContain("from '../../../../generated/lib/billing/create-checkout-session'");
  });

  test('test_BuildAiChatRoute_Generated_UsesProviderNotCannedReplies', () => {
    const route = buildAiChatRoute('api/ai/chat', '../s');
    expect(route).toContain('completeChat(');
    expect(route).not.toContain('Math.random');
    expect(route).toContain('AiNotConfiguredError ? 503');
  });
});

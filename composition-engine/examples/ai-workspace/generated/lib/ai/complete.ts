export interface ChatTurn {
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
          headers: { Authorization: `Bearer ${apiKey}` },
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
    throw new AiProviderError(
      body?.error?.message ?? `AI provider request failed (${response.status})`
    );
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

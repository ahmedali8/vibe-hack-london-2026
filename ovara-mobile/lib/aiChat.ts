// Provider-agnostic chat with automatic failover: GLM (Z.AI Coding API) is the
// primary; if it errors or returns nothing, fall back to Claude (Anthropic
// Messages API). Both are called via raw fetch from the device — consistent with
// the rest of the app and RN-friendly. Keys come from a gitignored .env.
//
// GLM:    EXPO_PUBLIC_GLM_API_KEY    (+ _BASE_URL, _MODEL)
// Claude: EXPO_PUBLIC_CLAUDE_API_KEY (+ _BASE_URL, _MODEL)

const GLM_KEY = process.env.EXPO_PUBLIC_GLM_API_KEY?.trim();
const GLM_BASE = (
  process.env.EXPO_PUBLIC_GLM_BASE_URL ?? 'https://api.z.ai/api/coding/paas/v4'
).replace(/\/$/, '');
const GLM_MODEL = process.env.EXPO_PUBLIC_GLM_MODEL ?? 'GLM-5.1';

const CLAUDE_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY?.trim();
const CLAUDE_BASE = (
  process.env.EXPO_PUBLIC_CLAUDE_BASE_URL ?? 'https://api.anthropic.com'
).replace(/\/$/, '');
const CLAUDE_MODEL = process.env.EXPO_PUBLIC_CLAUDE_MODEL ?? 'claude-opus-4-8';

export type ChatOpts = {
  maxTokens?: number;
  temperature?: number;
  primary?: 'glm' | 'claude'; // which provider to try first (default 'glm')
};

export function hasAiKey(): boolean {
  return Boolean(GLM_KEY || CLAUDE_KEY);
}

// GLM — OpenAI-compatible chat/completions.
async function glmChat(system: string, user: string, opts: ChatOpts): Promise<string | null> {
  if (!GLM_KEY) return null;
  const res = await fetch(`${GLM_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GLM_KEY}` },
    body: JSON.stringify({
      model: GLM_MODEL,
      temperature: opts.temperature ?? 0.5,
      max_tokens: opts.maxTokens ?? 1200,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`GLM error ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

// Claude — Anthropic Messages API. No temperature/top_p (removed on Opus 4.8).
// dangerous-direct-browser-access header is only needed for Expo web (RN ignores CORS).
async function claudeChat(system: string, user: string, opts: ChatOpts): Promise<string | null> {
  if (!CLAUDE_KEY) return null;
  const res = await fetch(`${CLAUDE_BASE}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': CLAUDE_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: opts.maxTokens ?? 1500,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Claude error ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim();
  return text || null;
}

// Try the primary provider first; on error or empty response, fall back to the
// other. opts.primary picks which goes first (default 'glm'). A provider with no
// key returns null and is skipped automatically.
export async function chat(system: string, user: string, opts: ChatOpts = {}): Promise<string | null> {
  const providers =
    opts.primary === 'claude'
      ? ([['Claude', claudeChat], ['GLM', glmChat]] as const)
      : ([['GLM', glmChat], ['Claude', claudeChat]] as const);
  for (const [name, fn] of providers) {
    try {
      const r = await fn(system, user, opts);
      if (r) return r;
    } catch (e) {
      console.warn(`${name} failed, trying next provider:`, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

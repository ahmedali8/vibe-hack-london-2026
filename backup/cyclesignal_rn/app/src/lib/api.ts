import { CycleEntry, PatternFlags } from '../types';

// Backend proxy client — PRD Section 5 / Constraints #7/#8.
// All third-party keys live on the Node server (../../server); the app only ever
// talks to it over HTTP via EXPO_PUBLIC_API_BASE_URL. Every call is best-effort:
// if the base URL is unset, the server is down, or a provider is unconfigured,
// these return null and the caller falls back to the on-device path so the demo
// always runs (privacy-first, no key required).

const BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

export type Capabilities = {
  hume: boolean;
  openai: boolean;
  gemini: boolean;
  anthropic: boolean;
  cartesia: boolean;
};

const OFFLINE: Capabilities = {
  hume: false,
  openai: false,
  gemini: false,
  anthropic: false,
  cartesia: false,
};

export function hasBackend(): boolean {
  return BASE.length > 0;
}

async function fetchJSON<T>(
  path: string,
  init: RequestInit | undefined,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; data: T | null }> {
  if (!BASE) return { ok: false, status: 0, data: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, signal: controller.signal });
    let data: T | null = null;
    try {
      data = (await res.json()) as T;
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

// Cached capability probe — which live providers the backend has keys for.
let capsPromise: Promise<Capabilities> | null = null;
export function getCapabilities(force = false): Promise<Capabilities> {
  if (force) capsPromise = null;
  if (!capsPromise) {
    capsPromise = (async () => {
      const { ok, data } = await fetchJSON<{ configured: Capabilities }>(
        '/health',
        { method: 'GET' },
        2500
      );
      return ok && data?.configured ? data.configured : OFFLINE;
    })();
  }
  return capsPromise;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

// Symptom extraction (OpenAI). Returns a fully-typed CycleEntry or null on failure.
export type ExtractContext = {
  transcript: string;
  cycleDay: number;
  cycleNumber: number;
  consentTimestamp: string;
  date?: string;
  source: CycleEntry['source'];
  emotionSnapshot: CycleEntry['emotionSnapshot'];
};

export async function remoteExtract(ctx: ExtractContext): Promise<CycleEntry | null> {
  const { ok, data } = await fetchJSON<{ entry: CycleEntry }>(
    '/extract',
    { method: 'POST', headers: jsonHeaders, body: JSON.stringify(ctx) },
    12000
  );
  return ok && data?.entry ? data.entry : null;
}

// Pattern narrative (Gemini). Returns the warm summary or null.
export async function remoteNarrative(
  flags: PatternFlags
): Promise<{ narrative: string; model: string } | null> {
  const { ok, data } = await fetchJSON<{ narrative: string; model: string }>(
    '/narrative',
    { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ flags }) },
    8000
  );
  return ok && data?.narrative ? data : null;
}

// Secondary safety classifier (Anthropic Haiku). null = unavailable/failed,
// true = crisis language detected, false = clear. The hard-coded RegExp remains
// the non-negotiable primary layer regardless of this result.
export async function remoteSafetyClassify(text: string): Promise<boolean | null> {
  const { ok, data } = await fetchJSON<{ flagged: boolean }>(
    '/safety',
    { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ text }) },
    2500
  );
  return ok && data && typeof data.flagged === 'boolean' ? data.flagged : null;
}

// Hume EVI 3 short-lived access token. Returns null if Hume is unconfigured/down.
export async function remoteHumeToken(): Promise<{
  accessToken: string;
  expiresIn: number;
  configId: string | null;
} | null> {
  const { ok, data } = await fetchJSON<{
    accessToken: string;
    expiresIn: number;
    configId: string | null;
  }>('/hume/token', { method: 'POST', headers: jsonHeaders }, 5000);
  return ok && data?.accessToken ? data : null;
}

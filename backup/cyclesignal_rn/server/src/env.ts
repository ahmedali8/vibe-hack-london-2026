import 'dotenv/config';

// Centralised, typed access to environment. Secrets live ONLY here, server-side.
function str(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim();
}

export const env = {
  port: Number(process.env.PORT ?? 8787),
  corsOrigin: str('CORS_ORIGIN'),

  hume: {
    apiKey: str('HUME_API_KEY'),
    secretKey: str('HUME_SECRET_KEY'),
    configId: str('HUME_CONFIG_ID'),
  },
  openai: {
    apiKey: str('OPENAI_API_KEY'),
    extractionModel: str('OPENAI_EXTRACTION_MODEL', 'gpt-4o-mini'),
  },
  gemini: {
    apiKey: str('GEMINI_API_KEY'),
    narrativeModel: str('GEMINI_NARRATIVE_MODEL', 'gemini-2.5-flash'),
  },
  anthropic: {
    apiKey: str('ANTHROPIC_API_KEY'),
    safetyModel: str('ANTHROPIC_SAFETY_MODEL', 'claude-haiku-4-5'),
  },
  cartesia: {
    apiKey: str('CARTESIA_API_KEY'),
    ttsModel: str('CARTESIA_TTS_MODEL', 'sonic-3'),
    voiceId: str('CARTESIA_VOICE_ID'),
  },
};

// Which providers are usable right now — surfaced on /health so the client knows
// which features can run live vs. fall back to on-device.
export const configured = {
  hume: Boolean(env.hume.apiKey && env.hume.secretKey),
  openai: Boolean(env.openai.apiKey),
  gemini: Boolean(env.gemini.apiKey),
  anthropic: Boolean(env.anthropic.apiKey),
  cartesia: Boolean(env.cartesia.apiKey),
};

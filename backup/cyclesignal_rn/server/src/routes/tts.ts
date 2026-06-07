import { Router } from 'express';
import { z } from 'zod';
import { env, configured } from '../env.js';

// Fallback TTS — PRD Section 5.4. Cartesia Sonic 3, ONLY used if Hume EVI 3 is
// unavailable (EVI is speech-to-speech and handles its own voice). Returns mp3
// bytes (base64) so a client without the EVI native module could still speak the
// AI lines. 503 when no key. Implemented over Cartesia's REST API to avoid pulling
// an SDK whose surface we don't consume elsewhere.

export const ttsRouter = Router();

const bodySchema = z.object({ text: z.string().min(1).max(2000) });

ttsRouter.post('/', async (req, res) => {
  if (!configured.cartesia || !env.cartesia.voiceId) {
    return res.status(503).json({ error: 'cartesia_not_configured' });
  }
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'bad_request' });
  try {
    const resp = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: {
        'X-API-Key': env.cartesia.apiKey,
        'Cartesia-Version': '2024-11-13',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_id: env.cartesia.ttsModel,
        transcript: parsed.data.text,
        voice: { mode: 'id', id: env.cartesia.voiceId },
        language: 'en',
        output_format: { container: 'mp3', sample_rate: 44100, bit_rate: 128000 },
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      return res.status(502).json({ error: 'cartesia_failed', detail });
    }
    const audio = Buffer.from(await resp.arrayBuffer());
    return res.json({ audioBase64: audio.toString('base64'), mimeType: 'audio/mpeg' });
  } catch (err) {
    return res.status(502).json({ error: 'tts_error', detail: String(err) });
  }
});
